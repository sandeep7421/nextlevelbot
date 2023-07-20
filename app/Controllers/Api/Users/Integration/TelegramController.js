const { Session,Project,SessionMessage,ProjectSetting,Organization,ProjectIntegration,TelegramIntegrationsSetting,ProjectUsage} = require("../../../../Models");
let { formatJoiError, isset, validateParameters,getIpDetail,checkQueryCount } = require(baseDir() + "helper/helper");
let { getQueryResponse,getQueryAdvanceType } = require(baseDir() + "helper/openai");
let Sequelize = require("sequelize");
const { v4: uuidv4 } = require('uuid');
const Op = Sequelize.Op;

module.exports = class TelegramController {

    /**
     * Create query and answer in session_messages table with session_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async query_telegram(req,res){
        // request body
        let input = req.body;
        let telegram_user_id = input.telegram_user_id;
        let query = input.query;
        let send_by = 'user';
        let integration_id = 7;
        // check parameter validation
        let result = validateParameters(["telegram_user_id","query"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        let ip_address = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        let ip_detail = await getIpDetail(ip_address)
        let country;
        if(typeof ip_detail === 'undefined' || ip_detail === null){
          country = null
        } else {
          country = ip_detail.country
        }
        // get telegram_settings_table data on the base of telegram_user_id
        let telegramData = await TelegramIntegrationsSetting.findOne({
            where:{
                telegram_user_id : telegram_user_id
            }
        })
        // through eroor if telegram_settings not found
        if(!telegramData){
            return res.status(400).send({type:"RXERROR",message:"Telegram is removed from your Integration. Please Go to YourGPT and enable telegram Integration"})
        }
        let project_id = telegramData.project_id
        console.log("PROJECT ID : ",project_id)
        // find projects data to get project_uid
        let project_uid_data = await Project.findOne({
            where:{
                id:project_id
            }
        });
        let project_uid = project_uid_data.project_uid;
        let purpose = project_uid_data.purpose;

    
        let data = await Project.findOne({
            include: [
                { model: ProjectSetting, as: 'projectSetting' },
                { model: Organization, as: 'organization' },
                // { model: Session, as: 'session' }
        ],
            where:{
                project_uid:project_uid
            },
        })
        let message = await checkQueryCount(res,project_id)

        if(message){
            return res.status(400).send({ type: "RXERROR", message: message })
        }
        if(data){
            let prompt_suffix = isset(data.projectSetting[0]['prompt_suffix'],null);
            // // create query in session_messages table with concat query and prompt_suffix
            const myAppId = uuidv4();
            // Check session data is found or not on the base of project_id and status
            let session_data = await Session.findOne({
                where:{
                    project_id:project_id,
                    integration_id:integration_id,
                    status:"open"
                }
            })
            // if session_data not found then create 
            if(!session_data){
                session_data = await Session.create({
                    session_uid: myAppId.substr(0, 8) + myAppId.substr(8, 4) + myAppId.substr(12, 4) + myAppId.substr(16, 4) + myAppId.substr(20),
                    integration_id:integration_id,
                    status:"open",
                    device_type:null,
                    platform:null,
                    ip:ip_address,
                    country:country,
                    project_id:data.id
                })
            }
            let session_id = session_data.id;
            // create query and answer in session_messages table
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
                message = await getQueryAdvanceType(query,project_uid,purpose)
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
     * enable telegram on the base of project_uid and telegram_user_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async enableTelegram(req,res){
        // request body
        let input = req.body;
        let telegram_user_id = input.telegram_user_id
        let project_uid = input.project_uid;
        let integration_id = 7;
        // validate input parameters
        let result = validateParameters(["project_uid","telegram_user_id"], input);
    
        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find projects detail on the base of project_uid to get project_id
        let project_data = await Project.findOne({
            where:{
                project_uid:project_uid
            }
        })
        // through error if projects data not found
        if(!project_data){
            return res.status(400).send({type:"RXERROR",message:"Please provide a valid project_uid"})
        }
    
        try{
            // find project_integrations data on the base of project_id and integration_id
            let checkData = await ProjectIntegration.findOne({
                where:{
                    project_id:project_data.id,
                    integration_id:integration_id
                }
            })
            // if project_integration data found then find telegram settings
            if(checkData){
                let update_telegram_setting = await TelegramIntegrationsSetting.findOne({
                    where:{
                        project_id:project_data.id
                    }
                })
                // if telegram setting found then update 
                if(update_telegram_setting){
                    await update_telegram_setting.update(input);
                    return res.status(400).send({type:"RXSUCCESS",message:"Telegram Setting updated successfully"})
                }else{
                    // if telegram settings not found then create
                    let telegram_data = await TelegramIntegrationsSetting.create({
                        project_id:project_data.id,
                        telegram_user_id:telegram_user_id
                    })
                    return res.status(200).send({type:"RXSUCCESS",message:"Telegram data enabled successfully",data:telegram_data})
                }
            }else{
                // create project_integrations 
                let data = await ProjectIntegration.create({
                    project_id:project_data.id,
                    integration_id:integration_id
                })
                if(data){
                    // after creating project_integrations , find telegram settings
                    let check_telegram_setting = await TelegramIntegrationsSetting.findOne({
                        where:{
                            project_id:project_data.id
                        }
                    })
                    // if telegram setting found then update 
                    if(check_telegram_setting){
                        await check_telegram_setting.update(input);
                        return res.status(400).send({type:"RXSUCCESS",message:"Telegram enabled successfully",data:data})
    
                    }else{
                        // if telegram settings not found then create
                        let telegram_data = await TelegramIntegrationsSetting.create({
                            project_id:project_data.id,
                            telegram_user_id:telegram_user_id
                        })
                        // return 200
                        return res.status(200).send({type:"RXSUCCESS",message:"Telegram enabled successfully",data:telegram_data})
                    }
                }
            }
        }catch(err){
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Something went wrong",error:err})
        }
    }

    /**
     * Update telegram_integratins_settings on the base of project_uid and telegram_user_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async updateTelegramSetting(req,res){
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let telegram_user_id = input.telegram_user_id;
        // validate input parameter
        let result = validateParameters(["project_uid","telegram_user_id"], input);
    
        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find projects detail to get the project_id
        let project_data = await Project.findOne({
            where:{
                project_uid:project_uid
            }
        })
        // through error if projects data not found
        if(!project_data){
            return res.status(400).send({type:"RXERROR",message:"Please provide a valid project_uid"})
        }
        // find telegram settings on the base of project_id and telegram_user_id
        let telegram_data = await TelegramIntegrationsSetting.findOne({
            where: {
                [Op.or]: [
                  { project_id: project_data.id },
                  { telegram_user_id: telegram_user_id }
                ]
              }
        })
        
        let telegram_id = telegram_data.id;
        
        if(telegram_data){
            // if telegram settings found then update 
            await TelegramIntegrationsSetting.update({
                    project_id: project_data.id,
                    telegram_user_id: telegram_user_id
                    },
                    {
                    where: {
                        id: telegram_id
                    }
                });
            // return 200
            return res.status(200).send({type:"RXSUCCESS",message:"Telegram setting updated successfully"})
        }else{
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Something went wrong"})
        }
    }

    /**
     * end telegram session on the base of integration_id , telegram_user_id and status
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async endTelegramSession(req,res){
        // request body
        let input = req.body;
        let telegram_user_id = input.telegram_user_id;
        let integration_id = 7;
        // validate input parameters 
        let result = validateParameters(["telegram_user_id"], input);

        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find telegram settings data on the base of telegram_user_id to get project_id
        let telegram_setting_data = await TelegramIntegrationsSetting.findOne({
            where:{
                telegram_user_id:telegram_user_id
            }
        })
        // if telegram settings not found then through error
        if(!telegram_setting_data){
            return res.status(400).send({type:"RXERROR",message:"Please provide a valid telegram_user_id"})
        }   
        let project_id = telegram_setting_data.project_id; 
        // find session on the base of integration_id , telegram_user_id and status (status should be open)
        let session_data = await Session.findOne({
            where:{
                project_id:project_id,
                integration_id:integration_id,
                status:'open'
            }
        })
        // if session data found then close the session
        if(session_data){
            await Session.update({status : "closed"},{
                    where : {
                        project_id : project_id,
                        integration_id:integration_id,
                        status:'open'
                    },
                })  
            // return 200
            return res.status(200).send({type:"RXSUCCESS",message:"Telegram Session closed successfully"})
        }else{
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Session not found"})
        }
    }
}