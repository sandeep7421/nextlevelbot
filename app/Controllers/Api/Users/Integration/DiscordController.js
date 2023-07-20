const { Session,Project,SessionMessage,ProjectSetting,Organization,Integration,ProjectIntegration,DiscordIntegrationsSetting,ProjectUsage} = require("../../../../Models");
let { formatJoiError, ucfirst, isset, strlen, strpos, count, authUser, rand, validateParameters,decrypt,getIpDetail,checkQueryCount,checkOrganizationLimit } = require(baseDir() + "helper/helper");
let { getQueryResponse,getQueryAdvanceType } = require(baseDir() + "helper/openai");

let Sequelize = require("sequelize");
const { Configuration, OpenAIApi } = require("openai");
const { v4: uuidv4 } = require('uuid');
const Op = Sequelize.Op;

module.exports = class DiscordController {
    /**
     * Create query and answer in session_messages table with session_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async query_discord(req,res){
        // request body
        let input = req.body;
        let public_key = input.public_key;
        let secret_key = input.secret_key;
        let guild_id = input.guild_id;
        let query = input.query;
        let send_by = 'user';
        let parameter = {};
        // check parameter validation
        let result = validateParameters(["public_key","secret_key","guild_id","query"], input);
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
        // get discord_settings_table data on the base of guild_id
        let discordData = await DiscordIntegrationsSetting.findOne({
            where:{
                guild_id : guild_id
            }
        })
        // through eroor if discord_settings not found
        if(!discordData){
            return res.status(400).send({type:"RXERROR",message:"Discord is removed from your Integration. Please Go to YourGPT and enable discord Integration"})
        }
        let project_id = discordData.project_id
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
        // return res.status(200).send({data:data})
        let message = await checkOrganizationLimit({app_id:data.app_id,project_id:null,organization_id : data.organization_id,usage_type : "credits"})
        if(message?.message){
            return res.status(400).send({ type: "RXERROR", message: message })
        }
        if(data){
            let prompt_suffix = isset(data.projectSetting[0]['prompt_suffix'],null);
            // // create query in session_messages table with concat query and prompt_suffix
            // dd(project_id)
            const myAppId = uuidv4();
            // Check session data is found or not on the base of project_id and status
            let session_data = await Session.findOne({
                where:{
                    project_id:project_id,
                    integration_id:1,
                    status:"open"
                }
            })
            // if session_data not found then create 
            if(!session_data){
                session_data = await Session.create({
                    session_uid: myAppId.substr(0, 8) + myAppId.substr(8, 4) + myAppId.substr(12, 4) + myAppId.substr(16, 4) + myAppId.substr(20),
                    integration_id:1,
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
     * Enable discord using project_id and guild_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async enableDiscord(req,res){
        // request body
        let input = req.body;
        let guild_id = input.guild_id
        let project_uid = input.project_uid;
        let permission = input.permission;
        // validate parameter
        let result = validateParameters(["project_uid","guild_id"], input);

        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // check permission 
        if(permission!='2147486720'){
            return res.status(400).send({type:"RXERROR",message:"Permission denied"})
        }
        // get project_data using project_uid
        let project_data = await Project.findOne({
            where:{
                project_uid:project_uid
            }
        })
        // through error if project uid is not found in projects
        if(!project_data){
            return res.status(400).send({type:"RXERROR",message:"Please provide a valid project_uid"})
        }

        try{
            // find project_integrations data 
            let checkData = await ProjectIntegration.findOne({
                where:{
                    project_id:project_data.id,
                    integration_id:1
                }
            })
            // if project_integrations data found then find discord_integrations_settings data
            if(checkData){
                // discord_integrations_settings data found then update 
                let update_discord_setting = await DiscordIntegrationsSetting.findOne({
                    where:{
                        project_id:project_data.id
                    }
                })
                if(update_discord_setting){
                    await update_discord_setting.update(input);
                    return res.status(400).send({type:"RXSUCCESS",message:"Discord Setting updated successfully"})
                }else{
                    // discord_integrations_settings not found then create
                    let discord_data = await DiscordIntegrationsSetting.create({
                        project_id:project_data.id,
                        guild_id:guild_id
                    })
                    return res.status(200).send({type:"RXSUCCESS",message:"Discord data enabled successfully",data:discord_data})
                }
            }else{
                // create data in project_integrations table
                let data = await ProjectIntegration.create({
                    project_id:project_data.id,
                    integration_id:1
                })
                if(data){
                    // find discord_integrations_setting 
                    let check_discord_setting = await DiscordIntegrationsSetting.findOne({
                        where:{
                            project_id:project_data.id
                        }
                    })
                    // if discord_integrations_settings found then update
                    if(check_discord_setting){
                        await check_discord_setting.update(input);
                        return res.status(400).send({type:"RXSUCCESS",message:"Discord enabled successfully",data:data})

                    }else{
                        // if discord_integration_settings not found then create
                        let discord_data = await DiscordIntegrationsSetting.create({
                            project_id:project_data.id,
                            guild_id:guild_id
                        })
                        // return 200
                        return res.status(200).send({type:"RXSUCCESS",message:"Discord enabled successfully",data:discord_data})
                    }
                }
            }
        }catch(err){
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Something went wrong",error:err})
        }
    }

    /**
     * Update discord_integratins_setting on the base of project_uid and guild_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async updateDiscordSetting(req,res){
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let guild_id = input.guild_id;
        // validate input parameters 
        let result = validateParameters(["project_uid","guild_id"], input);

        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // get project_data on the base of project_uid
        let project_data = await Project.findOne({
            where:{
                project_uid:project_uid
            }
        })
        // through error if project_data not found 
        if(!project_data){
            return res.status(400).send({type:"RXERROR",message:"Please provide a valid project_uid"})
        }
        // get project_integrations_setting data on the base of project_id and guild_id
        let discord_data = await DiscordIntegrationsSetting.findOne({
            where: {
                [Op.or]: [
                  { project_id: project_data.id },
                  { guild_id: guild_id }
                ]
              }
        })
        
        let discord_id = discord_data.id;
        // if discord_integrations_settings data found then update
        if(discord_data){
            await DiscordIntegrationsSetting.update({
                    project_id: project_data.id,
                    guild_id: guild_id
                    },
                    {
                    where: {
                        id: discord_id
                    }
                });
            // return 200
            return res.status(200).send({type:"RXSUCCESS",message:"Discord setting updated successfully"})
        }else{
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Something went wrong"})
        }
    }

    /**
     * end discord session on the base of 
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async endDiscordSession(req,res){
        // request body
        let input = req.body;
        let guild_id = input.guild_id;
        let integration_id = 1;
        // validate input parameter
        let result = validateParameters(["guild_id"], input);

        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find discord_integrations_setting data on the base of guild_id
        let discord_setting_data = await DiscordIntegrationsSetting.findOne({
            where:{
                guild_id:guild_id
            }
        })
        // thorugh error if discord_integrations_setting data not found
        if(!discord_setting_data){
            return res.status(400).send({type:"RXERROR",message:"Please provide a valid guild_id"})
        }   
        let project_id = discord_setting_data.project_id; 
        // find session on the base of project_id , integration_id and status (status should be open)
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
            return res.status(200).send({type:"RXSUCCESS",message:"Discord Session closed successfully"})
        }else{
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Session not found"})
        }
    }
}