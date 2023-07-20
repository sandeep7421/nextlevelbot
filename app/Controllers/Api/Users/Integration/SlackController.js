const { Session,Project,SessionMessage,ProjectSetting,Organization,Integration,ProjectIntegration,SlackIntegrationsSetting,ProjectUsage} = require("../../../../Models");
let { formatJoiError, ucfirst, isset, strlen, strpos, count, authUser, in_array, rand, validateParameters,decrypt,getIpDetail,checkQueryCount } = require(baseDir() + "helper/helper");
let Sequelize = require("sequelize");
const { Configuration, OpenAIApi } = require("openai");
const { v4: uuidv4 } = require('uuid');
const Op = Sequelize.Op;
let { getQueryResponse,getQueryAdvanceType} = require(baseDir() + "helper/openai");
let fetch= new require("node-fetch");

module.exports = class SlackController {
    /**
     * Create query and answer in session_messages table with session_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async query_slack(req,res){
        // request body
        let input = req.body;
        let public_key = input.public_key;
        let secret_key = input.secret_key;
        let slack_team_id = input.slack_team_id;
        let query = input.query;
        let send_by = "user";
        let parameter = {};
        // check parameter validation
        let result = validateParameters(["public_key","secret_key","slack_team_id","query"], input);
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
        // get slack_settings_table data on the base of slack_team_id
        let slackData = await SlackIntegrationsSetting.findOne({
            where:{
                slack_team_id : slack_team_id
            }
        })
        // if slack setting not found through error
        if(!slackData){
            return res.status(400).send({type:"RXERROR",message:"Slack is removed from Integration. Go to slack"})
        }
        let project_id = slackData.project_id
        console.log("PROJECT_ID",project_id)

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
                { model: Organization, as: 'organization' }
            ],
            where:{
                project_uid:project_uid
            }
        })
        // return res.status(200).send({data:data})
        let message = await checkQueryCount(res,project_id)

        if(message){
            return res.status(400).send({ type: "RXERROR", message: message })
        }
        if(data){
            let prompt_suffix = isset(data.projectSetting[0]['prompt_suffix'],null);
            // // create query in session_messages table with concat query and prompt_suffix
            const myAppId = uuidv4();
            // find session
            let session_data = await Session.findOne({
                where:{
                    project_id:project_id,
                    integration_id:2,
                    status:"open"
                }
            })
            // if session_data not found then create
            if(!session_data){
                session_data = await Session.create({
                    session_uid: myAppId.substr(0, 8) + myAppId.substr(8, 4) + myAppId.substr(12, 4) + myAppId.substr(16, 4) + myAppId.substr(20),
                    integration_id:2,
                    status:"open",
                    device_type:null,
                    platform:null,
                    ip:ip_address,
                    country:country,
                    project_id:data.id
                })
            }
            let session_id = session_data.id;
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
     * enable slack on the base of project_uid, integration_id and slack_team_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async enableSlack(req,res){
        // request body
        let input = req.body;
        let url = input.url;
        let code = input.code;
      
        // Verify code on slack
        let slackConfig = config('slack');
        let client_secret = slackConfig.client_secret;
        let client_id = slackConfig.client_id;
        let urlencoded = new URLSearchParams();
        urlencoded.append("client_id", client_id);
        urlencoded.append("client_secret", client_secret);
        urlencoded.append("code", code);
        let slackResponse = await fetch("https://slack.com/api/oauth.v2.access", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: urlencoded
        }).then(res=>res.json())
        if(slackResponse.ok==false){
            return res.status(400).send({type:"RXERROR",message:"Invalid Slack code. Please add slack again"})
        }

        let slack_team_id = slackResponse.team.id;
        let project_uid = input.project_uid;
        let integration_id = 2
        // validate paramters
        let result = validateParameters(["project_uid"], input);
    
        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find projects detail to get project_id
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
            // find project_integrations data
            let checkData = await ProjectIntegration.findOne({
                where:{
                    project_id:project_data.id,
                    integration_id:integration_id
                }
            })
            if(checkData){ // if project_integrations data found then found slack settings
                let update_slack_setting = await SlackIntegrationsSetting.findOne({
                    where:{
                        project_id:project_data.id
                    }
                })
                // if slack settings found tyhen update the slack setting
                if(update_slack_setting){
                    await update_slack_setting.update(input);
                    return res.status(400).send({type:"RXSUCCESS",message:"Slack Setting updated successfully"})
                }else{
                    // if slack setting not found the create
                    let slack_data = await SlackIntegrationsSetting.create({
                        project_id:project_data.id,
                        slack_team_id:slack_team_id
                    })
                    return res.status(200).send({type:"RXSUCCESS",message:"Slack data enabled successfully",data:slack_data})
                }
            }else{
                // if project_integrations data not found then create
                let data = await ProjectIntegration.create({
                    project_id:project_data.id,
                    integration_id:integration_id
                })
                if(data){ //after creating project_integrations find slack settings
                    let check_slack_setting = await SlackIntegrationsSetting.findOne({
                        where:{
                            project_id:project_data.id
                        }
                    })
                    // if slack setting found then update
                    if(check_slack_setting){
                        await check_slack_setting.update(input);
                        return res.status(400).send({type:"RXSUCCESS",message:"Slack enabled successfully",data:data})
    
                    }else{ //if slack settings not found then create
                        let slack_data = await SlackIntegrationsSetting.create({
                            project_id:project_data.id,
                            slack_team_id:slack_team_id
                        })
                        // return 200
                        return res.status(200).send({type:"RXSUCCESS",message:"Slack enabled successfully",data:slack_data})
                    }
                }
            }
        }catch(err){
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Something went wrong",error:err})
        }
    }
    
    /**
     * end slack_session on the base of slack_team_id and integration_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async endSlackSession(req,res){
        // request body
        let input = req.body;
        let slack_team_id = input.slack_team_id;
        let integration_id = 2;
        // validate input parameters
        let result = validateParameters(["slack_team_id"], input);

        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find slack settings data on the base of slack_team_id to get poroject_id
        let slack_setting_data = await SlackIntegrationsSetting.findOne({
            where:{
                slack_team_id:slack_team_id
            }
        })
        // if slack settings not found then through error
        if(!slack_setting_data){
            return res.status(400).send({type:"RXERROR",message:"Please provide a valid slack_team_id"})
        }   

        let project_id = slack_setting_data.project_id; 
        // find session data on the base of project_id,integration_id and status(status should be open)
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
            //  return 200
            return res.status(200).send({type:"RXSUCCESS",message:"Slack Session closed successfully"})
        }else{
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Session not found"})
        }
    }

}