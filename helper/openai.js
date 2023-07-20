let { isset, decrypt } = require(baseDir() + "helper/helper");
const { Configuration, OpenAIApi } = require("openai");
let Sequelize = require("sequelize");
let { SessionMessage,sequelize,Project,ProjectSetting,Organization } = require("../app/Models");
const key = config('app');
let fetch= new require("node-fetch");


const getQueryResponse = (async (req, query, api_key, data,session_id) => {
  // console.log(session_id)
  // dd()
  try{

  
  let prompt_suffix = data.projectSetting[0].prompt_suffix
  let parameter = {};
  let chat_paramter = {};

  let req_path = req.path
  let newStr = req_path.substring(1);


  let decrypt_api_key = await decrypt(api_key);
  api_key = decrypt_api_key

  if (api_key == null || api_key == '') {
    return res.status(400).send({ type: "RXERROR", message: "api_key has invalid or undefined value" })
  }
  const configuration = new Configuration({
    apiKey: api_key
  });
  let model = data.projectSetting[0]['model'];
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~", model, "~~~~~~~~~~~~~~~~~~~~~~~~~~~")

  parameter.model = model;
 
  switch (newStr) {
    case 'discord/query_discord':
      parameter.prompt = `You are Azmeth, A very intelligent question answering discord bot. You will smartly answer to following questions. You will respond with "I'm sorry, but I don't know the answer to that at this time. Can I help you with anything else?" if you don't know the exact answer.`;
      break;
    case 'slack/query_slack':
      parameter.prompt = `You are Azmeth, A very intelligent question answering slack bot. You will smartly answer to following questions. You will respond with "I'm sorry, but I don't know the answer to that at this time. Can I help you with anything else?" if you don't know the exact answer.`;
      break;
    default:
      parameter.prompt = `You are a very intelligent question answering Website Chat bot. You will answer to following conversation. You will respond with "I'm sorry, but I don't know the answer to that at this time. Can I help you with anything else?" if you don't know the exact answer.`;
  }

  // let max_tokens = isset(parseInt(data.projectSetting[0]['max_tokens']),200);
  if (isset(data.projectSetting[0]['max_tokens'], false)) {
    parameter.max_tokens = parseInt(data.projectSetting[0]['max_tokens']);
  }
  // let temperature = isset(parseInt(data.projectSetting[0]['temperature']),1);
  if (isset(data.projectSetting[0]['temperature'], false)) {
    parameter.temperature = parseInt(data.projectSetting[0]['temperature']);
  }
  // let stop = isset(data.projectSetting[0]['stop'],null);
  if (isset(data.projectSetting[0]['stop'], false)) {
    parameter.stop = data.projectSetting[0]['stop']
  }

  // create playground 
  const openai = new OpenAIApi(configuration);  
  if (model == 'gpt-3.5-turbo-0301' || model == 'gpt-3.5-turbo') { //Create chat  
    let session_messages_data = await SessionMessage.findAll({
      attributes:[
        [Sequelize.literal('send_by'), 'role'],
        [Sequelize.literal('message'), 'content'],
      ],
      order:[['id', 'desc']],
      limit: 10,
      where:{
        session_id:session_id
      }
    })
    session_messages_data.unshift({
      role:'system',
      content:parameter.prompt
    })
    session_messages_data.push({
      role: 'user',
      content: query
    });   
    let messages = session_messages_data
    chat_paramter.model = parameter.model;
    chat_paramter.messages = messages;
    chat_paramter.temperature = parameter.temperature;
    chat_paramter.stop = parameter.stop;
    chat_paramter.max_tokens = parameter.max_tokens;
    console.log(chat_paramter)
    const response = await openai.createChatCompletion(
      chat_paramter
    );

    let message = response['data']['choices'][0]['message']['content']
    return message;

  }else{
    const oldConversation = await sequelize.query(`SELECT group_concat(concat(UPPER(send_by),": ",message),"\n") as message FROM yourgpt.session_messages order by id desc limit 1`)
  
    // parameter.prompt+=`
    // ${oldConversation.message}
    // USER: ${query}${prompt_suffix}
    // AI:`
    const response = await openai.createCompletion(
      parameter
    );
    let message = response['data']['choices'][0]['text'];
    message = message.replace(" ", "");
    return message;
 
  }
  }catch(e){
    console.log("OpenAI Query Error",e?.response?.data?.error);
    if(e?.response?.data?.error){
      return e?.response?.data?.error?.message;
    }

    if(typeof e.message!="undefined"){
      return e.message;
    }

    return "Something went wrong!"
  }
});



const getQueryAdvanceType = (async (query,project_uid,purpose) => {
  console.log("Purpose:",purpose)
  let public_key = key.python_api_public_key;
  let secret_key = key.python_api_secret_key;
  // console.log(project_uid)
  // console.log(query)
  // console.log(public_key,"&&&&&&&&&&&&&&&");
  // console.log(secret_key,"secret_key")

  const url = key.python_url+'query';
  const urlencoded = new URLSearchParams();
  urlencoded.append('project_uid', project_uid);
  urlencoded.append('query', query);
  urlencoded.append('secret_key', secret_key);
  urlencoded.append('public_key', public_key);
  urlencoded.append('purpose', purpose);
    let response = await fetch(url, {
      method: 'POST',
      headers: {
          'content-type': 'application/x-www-form-urlencoded'
      },
      body: urlencoded
  }).then(response=>response.json())

  return response.message;
  })
module.exports = {
  getQueryResponse,
  getQueryAdvanceType
}
