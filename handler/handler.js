require("../bin/kernel");
let fetch=require('node-fetch');
let session = controller("Api/Users/Project/SessionController");

  
  /**
    * joinHandler function
    * 
    */
  module.exports.keepFunctionHot = async (event, context) => {

    let pythonAPIStatus=await fetch(env('PYTHON_URL')+"status").then(res=>res.json())
    console.log("Python API status",pythonAPIStatus)

    let nodejsAPIStatus=await fetch("https://api.yourgpt.ai/api/v1/status").then(res=>res.json())
    console.log("Nodejs API status",nodejsAPIStatus)
  
    let botsStatus=await fetch("https://bots.yourgpt.ai/api/v1/status").then(res=>res.json())
    console.log("Bots status",botsStatus)
  
    // return response success
    return {
      statusCode: 200,
    };
  }

  /**
    * joinHandler function
    * 
    */
  module.exports.sendChatBotConversationOnEmailHandler = async (event, context) => {
    console.log("BEFORE sendChatBotConversationOnEmail",event);
    await session.sendChatBotConversationOnEmail();
    console.log("AFTER sendChatBotConversationOnEmail",event);

    // return response success
    return {
      statusCode: 200,
    };
  }
  