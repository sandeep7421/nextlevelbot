const { Session,Project,SessionMessage,ProjectSetting,ZapierIntegrationsSetting,ProjectIntegration,Organization,ProjectUsage} = require("../../../../Models");
let { formatJoiError, ucfirst, isset,authUser, in_array, rand, validateParameters,decrypt,getIpDetail,checkQueryCount } = require(baseDir() + "helper/helper");
let Sequelize = require("sequelize");
const { Configuration, OpenAIApi } = require("openai");
const { v4: uuidv4 } = require('uuid');
let { getQueryResponse,getQueryAdvanceType } = require(baseDir() + "helper/openai");
const Op = Sequelize.Op;

module.exports = class ZapierController {
    /**
     * Create query and answer in session_messages table with session_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async query_zapier(req,res){
        // request body
        let project_id = req.project.id
        let input = req.body;
        let integration_id = 4
        // let project_uid = input.project_uid;
        let query = input.query;
        let send_by = "user";
        let parameter = {};
        // check parameter validation
        let result = validateParameters(["query"], input);
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
        console.log("PROJECT ID : ",project_id)

        // get zapier_settings_table data on the base of project_id
        let zapierData = await ZapierIntegrationsSetting.findOne({
            where:{
                project_id : project_id
            }
        })
        // if zapier_setting not found through error
        if(!zapierData){
            return res.status(400).send({type:"RXERROR",message:"Zapier is removed from Integration. Go to zapier"})
        }
        
        let data = await Project.findOne({
            include: [
                { model: ProjectSetting, as: 'projectSetting' },
                { model: Organization, as: 'organization' },
        ],
            where:{
                id:project_id
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
            // get session on the base of project_id where status is open
            let session_data = await Session.findOne({
                where:{
                    project_id:project_id,
                    integration_id:integration_id,
                    status:"open"
                }
            })
            // if session not found then create
            if(!session_data){
                session_data = await Session.create({
                    session_uid: myAppId.substr(0, 8) + myAppId.substr(8, 4) + myAppId.substr(12, 4) + myAppId.substr(16, 4) + myAppId.substr(20),
                    integration_id:integration_id,
                    status:"open",
                    device_type:null,
                    platform:null,
                    ip:ip_address,
                    country:country,
                    project_id:project_id
                })
            }
            let session_id = session_data.id;

            // create user query and agent answer in session_messages table
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
            return res.status(400).send({type:"RXERROR",message:"Incorrect project_uid"})
        }
    }

    /**
     * enable zapier
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async enableZapier(req,res){
        // request body
        let project_id = req.project.id
        let input = req.body;
        // let project_uid = input.project_uid;
        let integration_id = 4
        
        try{
            // find project_integratins data on the base of project_id and integration_id
            let checkData = await ProjectIntegration.findOne({
                where:{
                    project_id:project_id,
                    integration_id:integration_id
                }
            })
            // if project_integrations data found then check zapier_integrations_settings
            if(checkData){
                let update_zapier_setting = await ZapierIntegrationsSetting.findOne({
                    where:{
                        project_id:project_id
                    }
                })
                // if zapier_integrations_setting found then update
                if(update_zapier_setting){
                    await update_zapier_setting.update(input);
                    return res.status(200).send({type:"RXSUCCESS",message:"Zapier Setting updated successfully"})
                }else{
                    // if zapier_integrations_setting not found then create
                    let zapier_data = await ZapierIntegrationsSetting.create({
                        project_id:project_id,
                    })
                    return res.status(200).send({type:"RXSUCCESS",message:"Zapier data enabled successfully",data:zapier_data})
                }
            }else{
                // If project_integration data not found then create 
                let data = await ProjectIntegration.create({
                    project_id:project_id,
                    integration_id:integration_id
                })
                if(data){
                    //find zapier_integrations_settings data 
                    let check_zapier_setting = await ZapierIntegrationsSetting.findOne({
                        where:{
                            project_id:project_id
                        }
                    })
                    // if zapier_integrations_settings data found then update 
                    if(check_zapier_setting){
                        await check_zapier_setting.update(input);
                        return res.status(200).send({type:"RXSUCCESS",message:"Zapier enabled successfully",data:data})
    
                    }else{ //if zapier_integrations_settings data not found the create
                        let zapier_data = await ZapierIntegrationsSetting.create({
                            project_id:project_id,
                        })
                        // return 200
                        return res.status(200).send({type:"RXSUCCESS",message:"Zapier enabled successfully",data:zapier_data})
                    }
                }
            }
        }catch(err){
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Something went wrong",error:err})
        }
    }

    /**
     * end zapier session on the base of project_id and integration_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async endZapierSession(req,res){
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let integration_id = 4;
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
        // find projects data on the base of project_uid
        let project_data = await Project.findOne({
            where:{
                project_uid:project_uid
            }
        })
        // through error if projects data not found
        if(!project_data){
            return res.status(400).send({type:"RXERROR",message:"Please provide a valid project_uid"})
        }   
        let project_id = project_data.id; 
        // find sessions data on the base of project_id , integration_id and status (status should be open)
        let session_data = await Session.findOne({
            where:{
                project_id:project_id,
                integration_id:integration_id,
                status:'open'
            }
        })
        // if session found then close it 
        if(session_data){
            await Session.update({status : "closed"},{
                    where : {
                        project_id : project_id,
                        integration_id:integration_id,
                        status:'open'
                    },
                })   
            // return 200 
            return res.status(200).send({type:"RXSUCCESS",message:"Zapier Session closed successfully"})
        }else{
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Zapier Session not found"})
        }
    }
     
    /**
     * Create zapier session
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async createZapierSession(req,res){
        // request body
        let input = req.body;
        let integration_id = 4;
        let project_uid = input.project_uid;
        // check parameter validation
        let result = validateParameters(["project_uid"], input);
        if (result != 'valid') {
        let error = formatJoiError(result.errors);
        return res.status(400).send({
            type: "RXERROR",
            message: "Invalid params",
            errors: error
        });
        }
        // get ip_address
        let ip_address = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        let ip_detail = await getIpDetail(ip_address)
        let country;
        if(typeof ip_detail === 'undefined' || ip_detail === null){
          country = null
        } else {
          country = ip_detail.country
        }        
        // Get project data by project_uid
        let project_data = await Project.findOne({
            where:{
                project_uid:project_uid
            }
        })

        const myAppId = uuidv4();
        let session_uid = myAppId.substr(0, 8) + myAppId.substr(8, 4) + myAppId.substr(12, 4) + myAppId.substr(16, 4) + myAppId.substr(20);
        // let hash =  sha256("YOURGPT_SECRET" + project_uid + "-" + Math.floor(Date.now() / 1000) + Math.floor(Date.now() / 1000));
        if(project_data){ //if projects data found then create session
            let session_data = await Session.create({
                integration_id:integration_id,
                status:'open',
                device_type:input.device_type,
                ip:ip_address,
                country:country,
                platform:input.platform,
                project_id:project_data.id,
                session_uid:session_uid
            })
            // return 200
            return res.status(200).send({ type: "RXSUCCESS", message: "Zapier session created successfully",data:session_data});

        }else{
            // return 400
            return res.status(400).send({ type: "RXERROR", message: "Invalid project uid" });
        }
    }
}
