const { Session,Project,ProjectUsage,SessionMessage,ProjectDomain,ProjectSetting,ProjectIntegration,ApiIntegrationsSetting,Organization,ProjectKey,Integration,SlackIntegrationsSetting,DiscordIntegrationsSetting,ChatbotIntegrationsSetting} = require("../../../../Models");
let { formatJoiError, isset, authUser, in_array,createJwtToken, validateParameters,checkQueryCount } = require(baseDir() + "helper/helper");
let Sequelize = require("sequelize");
// const { Configuration, OpenAIApi } = require("openai");
const { v4: uuidv4 } = require('uuid');
const Op = Sequelize.Op;
let { getQueryResponse,getQueryAdvanceType } = require(baseDir() + "helper/openai");
const query_count_data = config('plan');
const key = config('app');
let moment = require("moment");

module.exports = class ApiIntegrationController {
    /**
     * Insert question and answer in session_messages table
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async query(req,res){
        // request body
        let input = req.body;
        let public_key = input.public_key;
        let secret_key = input.secret_key;
        let session_uid = input.session_uid;
        // let hash = input.hash;
        let query = input.query;
        let send_by = "user";
        let parameter = {};
        // check parameter validation
        let result = validateParameters(["query","session_uid"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        } 
        let project_uid_data = await ProjectKey.findOne({
            include:[{
                model:Project,
                as:"project"
            }],
            where:{
                public_key:public_key,
                secret_key:secret_key
            }
        })
        let project_uid = project_uid_data.project.project_uid;
        // find session on the base of session_uid
        let session_data = await Session.findOne({
            where:{
                session_uid:session_uid,
                status:'open'
            }
        })
        // if session is not found or session is found but status is closed then through error
        if(!session_data){
            return res.status(400).send({type:"RXERROR",message:"This session is closed or inavlid"})
        }
        // get project data with project_setting , organization and session
        let data = await Project.findOne({
            include: [{ 
                model: ProjectSetting, 
                as: 'projectSetting' ,
            },
            { 
                model: Organization, 
                as: 'organization' ,
            }
        ],
            where:{
                project_uid:project_uid
            },
        })
        let project_id = data.id;
        console.log("Project_id :",project_id)

        let message = await checkQueryCount(res,project_id)

        if(message){
            return res.status(400).send({ type: "RXERROR", message: message })
        }

        // return res.status(200).send({data:data})
        if(data){
            let prompt_suffix = isset(data.projectSetting[0]['prompt_suffix'],null);
            const myAppId = uuidv4();
       
            let session_id = session_data.id;   
            // let session_id = data.session[0]['id'];
            await SessionMessage.create({
                session_id:session_id,
                send_by:send_by,
                message:query.concat(prompt_suffix)
            })
            await ProjectUsage.increment('query_count', { by: 1, where: { project_id: project_id }});
            let message;
            if(data.type=='basic'){
                // get api key from data
                let api_key = data.organization.openai_key;
                message = await getQueryResponse(req,query,api_key,data,session_id);
            }else{
                if(project_uid==null || typeof project_uid=='undefined'){
                    return res.status(400).send({type:"RXERROR","message": "Invalid params",errors:{project_uid:"project_uid cannot be blank"}})
                }
                message = await getQueryAdvanceType(query,project_uid)
                if(message.ok==false){
                    return res.status(400).send({type:"RXERROR",message:"Invalid url"})
                }
            }

            send_by = "assistant"
            // create answer in session_messages table
            await SessionMessage.create({
                session_id:session_id,
                send_by:send_by,
                message:message
            })  
            return res.status(200).send({type:"RXSUCCESS",message:"Reponse your query","data": { "message": message } })


        }else{
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Incorrect project_uid or hash value"})
        }
    }

    /**
     * enable apiIntegration
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async enableApiIntegration(req,res){
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let integration_id = 6
        // validate input parameters
        let result = validateParameters(["project_uid"], input);
        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find projects data on the base of project_uid to get project_id
        let project_data = await Project.findOne({
            where:{
                project_uid:project_uid
            }
        })
        // if projects data not found through error
        if(!project_data){
            res.status(400).send({type:"RXERROR",message:"Please provide a valid project_uid"})
        }

        let project_id = project_data.id;
    
        try{
            // find project_integrations on the base of project_id and integration_id
            let checkData = await ProjectIntegration.findOne({
                where:{
                    project_id:project_id,
                    integration_id:integration_id
                }
            })
            // if project_integrations found then find api_integrations_settins
            if(checkData){
                let update_api_integration_setting = await ApiIntegrationsSetting.findOne({
                    where:{
                        project_id:project_id
                    }
                })
                // if api_integrations_settings found then update 
                if(update_api_integration_setting){
                    await update_api_integration_setting.update(input);
                    return res.status(200).send({type:"RXSUCCESS",message:"Api Integration Setting updated successfully"})
                }else{
                    // if api_integrations_settings not found then create
                    let api_integration_data = await ApiIntegrationsSetting.create({
                        project_id:project_id,
                    })
                    return res.status(200).send({type:"RXSUCCESS",message:"ApiIntegration data enabled successfully",data:api_integration_data})
                }
            }else{
                // if project_integrations not found then create 
                let data = await ProjectIntegration.create({
                    project_id:project_id,
                    integration_id:integration_id
                })
                if(data){
                    // find api_integrations_settings
                    let check_api_integration_setting = await ApiIntegrationsSetting.findOne({
                        where:{
                            project_id:project_id
                        }
                    })
                    // if api_integrations_settings found the update
                    if(check_api_integration_setting){
                        await check_api_integration_setting.update(input);
                        return res.status(200).send({type:"RXSUCCESS",message:"ApiIntegration enabled successfully",data:data})
    
                    }else{
                        // if api_integrations_settings not found then create 
                        let api_integration_data = await ApiIntegrationsSetting.create({
                            project_id:project_id,
                        })
                        // return 200
                        return res.status(200).send({type:"RXSUCCESS",message:"ApiIntegration enabled successfully",data:api_integration_data})
                    }
                }
            }
        }catch(err){
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Something went wrong",error:err})
        }
    }
    
    /**
     * end api_integration session
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async endSession(req,res){
        // request body
        let integration_id = 6;
        let project_id = req.project.id    
        // validate input parameters
        let result = validateParameters(["session_uid"], input);
        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find session data on the base of project_id , integration_id , session_uid and status (status should be open)
        let session_data = await Session.findOne({
            where:{
                project_id:project_id,
                integration_id:integration_id,
                session_uid: input.session_uid,
                status:'open'
            }
        })
        // if session_data found then close session
        if(session_data){
            await Session.update({status : "closed"},{
                where : {
                    project_id : project_id,
                    integration_id:integration_id,
                    status:'open'
                },
            });    
            // return 200
            return res.status(200).send({type:"RXSUCCESS",message:"API Integration Session closed successfully"})
        }else{
            // return 400
            return res.status(400).send({type:"RXERROR",message:"API Integration Session not found"})
        }
    }

    /**
     * create api_integration session
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async createSession(req,res){
        // request body
        let integration_id = 6;
        let project_id = req.project.id;      
        let ip_address = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        let input=req.body;      
        let current_date = moment().format("YYYY-MM-DD HH:mm:ss");
        
        let project_data = req.project
        let purpose = project_data.purpose;
        
        console.log(".....Purpose..........",purpose)
        const myAppId = uuidv4();
        let session_uid = myAppId.substr(0, 8) + myAppId.substr(8, 4) + myAppId.substr(12, 4) + myAppId.substr(16, 4) + myAppId.substr(20);
        // let hash =  sha256("YOURGPT_SECRET" + project_uid + "-" + Math.floor(Date.now() / 1000) + Math.floor(Date.now() / 1000));
        try{
            // create api_integration session
            let session_data = await Session.create({
                integration_id:integration_id,
                status:'open',
                device_type:input.device_type,
                ip:ip_address,
                platform:input.platform,
                project_id:project_id,
                session_uid:session_uid
            });
            let jwtToken=null;

            let project_domain = await ProjectDomain.findAll({
                attributes: ["domain"],
                where: {
                    project_id: project_id
                }
            })

            let domain_str = project_domain.map(item => item.domain).join(", ");
            if(purpose == 'chatbot'){
                let chatbot_setting = await ChatbotIntegrationsSetting.findOne({
                    where: {
                        project_id: project_id
                    }
                })
                let jwt_data = {
                    "organization_id": project_data.organization_id,
                    "project_uid": project_data.project_uid,
                    "project_id": project_id,
                    "widget_uid": chatbot_setting.widget_uid,
                    "product": project_data.name,
                    "session_id": session_data.id,
                    "session_uid": session_data.session_uid,
                    "allowed_domains": domain_str,
                    "prompt":  chatbot_setting.base_prompt,
                    "created_at": current_date,
                    "updated_at": chatbot_setting.updatedAt
                };
                jwtToken = await createJwtToken(jwt_data);
            } else {
                let jwt_data = {
                    "organization_id": project_data.organization_id,
                    "project_uid": project_data.project_uid,
                    "project_id": project_id,
                    // "widget_uid": chatbot_setting.widget_uid,
                    "product": project_data.name,
                    "session_id": session_data.id,
                    "session_uid": session_data.session_uid,
                    "allowed_domains": domain_str,
                    "created_at": current_date
                    // "prompt":  chatbot_setting.base_prompt,
                    // "updated_at": chatbot_setting.updated_at,
                };
                jwtToken = await createJwtToken(jwt_data);

            }
            // return 200
            return res.status(200).send({ type: "RXSUCCESS", message: "Session created successfully",data:{
                session:session_data,
                token:jwtToken,
                streamUrl:"https://google.com"
            }});
            
        }catch(err){
            console.log("Error while creating sessions",err)
            // return 400
            return res.status(400).send({ type: "RXERROR", message: "Something went wrong" });
        }
    }

    /**
     * Craete playground
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async playground(req,res){
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let query = input.query;
        let model = input.model;
        let temperature = input.temperature;

        let public_key = key.python_api_public_key;
        let secret_key = key.python_api_secret_key; 
        let url = key.python_url+'playground';

        const urlencoded = new URLSearchParams();
        urlencoded.append('project_uid', project_uid);
        urlencoded.append('model', model);
        urlencoded.append('temperature', temperature);
        urlencoded.append('query', query);
        urlencoded.append('secret_key', secret_key);
        urlencoded.append('public_key', public_key);
          let response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: urlencoded
        }).then(response=>response.json())
        // return 200
        return res.status(200).send({type:"RXSUCCESS",message:"Reponse your query","data": { "message": response.message } })
    }
      
}

