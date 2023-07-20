const { User,ProjectIntegration, ChatbotIntegrationsSetting,SlackIntegrationsSetting, DiscordIntegrationsSetting, Project, Integration ,ZapierIntegrationsSetting , WidgetFormField} = require("../../../../Models");
let sha256 = require("sha256");
let moment = require("moment");
let Joi = require("@hapi/joi");
let md5 = require("md5");
const { v4: uuidv4 } = require('uuid');
let { formatJoiError, ucfirst, isset, strlen, strpos, count, authUser, in_array, rand, validateParameters, getIpDetail,userPrivilege } = require(baseDir() + "helper/helper");
// let { sessionMiddleware } = require('../../Middlewares/Auth')
let Sequelize = require("sequelize");
const Op = Sequelize.Op;
const fetch = require('node-fetch');

module.exports = class ProjectIntegrationController {

    /**
     * disable integrations on the base of project_uid and integration_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async disableIntegration(req,res){
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let integration_id = input.integration_id;
        // validate input parameters
        let result = validateParameters(["project_uid","integration_id"], input);

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
        // if project_detail not found , return error
        if(!project_data){
            return res.status(400).send({type:"RXERROR",message:"Please provide a valid project_uid"})
        }
        // find project_integration data on the base of project_id and integration_id
        let data = await ProjectIntegration.destroy({
            where:{
                project_id:project_data.id,
                integration_id:integration_id
            }
        })
        // if data found return success response on the base of integration_id
        if(data){
            if(integration_id=='1'){
                return res.status(200).send({type:"RXSUCCESS",message:"Discord integartion disabled successfully"})
            }
            if(integration_id=='2'){
                return res.status(200).send({type:"RXSUCCESS",message:"Slack integartion disabled successfully"})
            }
            if(integration_id=='3'){
                return res.status(200).send({type:"RXSUCCESS",message:"Chatbot integartion disabled successfully"})
            }
            if(integration_id=='4'){
                return res.status(200).send({type:"RXSUCCESS",message:"Zapier integartion disabled successfully"})
            }
            if(integration_id=='6'){
                return res.status(200).send({type:"RXSUCCESS",message:"Api integartion disabled successfully"})
            }
            if(integration_id=='7'){
                return res.status(200).send({type:"RXSUCCESS",message:"Telegram disabled successfully"})
            }
        }
        else{
            // return 400
            return res.status(400).send({type:"RXERROR",message:"Integration not found"})
        }
    }
    
    /**
     * Get integration settings on the base of project_uid and integration_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getIntegrationSetting(req,res){
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let integration_id = input.integration_id;
        // validate input parameters
        let result = validateParameters(["project_uid","integration_id"], input);

        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find project data on the base of project_uid to get project_id
        let project_data = await Project.findOne({
            where:{
                project_uid:project_uid
            }
        })
        // if project_data not found , return error
        if(!project_data){
            res.status(400).send({type:"RXERROR",message:"Please provide a valid project_uid"})
        }
        // get discord settings data on the base of project_id
        if(integration_id=='1'){
            let discord_data = await ProjectIntegration.findOne({
                include:[{
                    model:DiscordIntegrationsSetting,
                    as:'discordIntegrationsSetting'

                }],
                where:{
                    project_id:project_data.id,
                }
            })
            if(discord_data){
                // return 200
                return res.status(200).send({type:"RXSUCCESS",message:"Get discord setting data",data:discord_data['discordIntegrationsSetting']})
            }
            else{
                // return 400
                return res.status(400).send({type:"RXERROR",message:"There is no discord setting of this project"})

            }
        // get slack settings data on the base of project_id
        }else if (integration_id=='2'){
            let slack_data = await ProjectIntegration.findOne({
                include:[{
                    model:SlackIntegrationsSetting,
                    as:'slackIntegrationsSetting'

                }],
                where:{
                    project_id:project_data.id
                }
            })
            if(slack_data) {
                // return 200
                return res.status(200).send({type:"RXSUCCESS",message:"Get slack setting data",data:slack_data['slackIntegrationsSetting']})
            }
            else{
                // return 400
                return res.status(400).send({type:"RXERROR",message:"There is no slack setting of this project"})
            }
        // get chatbot settings data on the base of project_id
        }else if(integration_id=='3'){
            let chatbot_data = await ProjectIntegration.findOne({
                include:[{
                    model:ChatbotIntegrationsSetting,
                    as:'chatbotIntegrationsSetting',
                    include:[{
                        model:WidgetFormField,
                        as:'widget_form_field'
                    }]
                }],
                where:{
                    project_id:project_data.id
                }
            });
            if(chatbot_data) {
                if (chatbot_data['chatbotIntegrationsSetting']['logo'] != null) {
                    chatbot_data['chatbotIntegrationsSetting']['logo'] = "https://assets.yourgpt.ai/chatbots/" + chatbot_data['chatbotIntegrationsSetting']['logo'];
                }
                return res.status(200).send({type:"RXSUCCESS",message:"Get chatbot setting data",data:chatbot_data['chatbotIntegrationsSetting']})
            }else{
                return res.status(400).send({type:"RXERROR",message:"There is no chatbot setting of this project"})
            }
        }else{
            return res.status(400).send({type:"RXERROR",message:"Something went wrong"})

        }

    }

    /**
     * Update integration settings on the base of project_uid and integration_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async updateIntegrationSettiong(req,res){
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let integration_id = input.integration_id;
        // validate input parameters
        let result = validateParameters(["project_uid","integration_id"], input);

        if (result != 'valid') { 
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find project detail on the base of project_uid to get project_id
        let project_data = await Project.findOne({
            where:{
                project_uid:project_uid
            }
        })
        //  if projects detail not found then return error
        if(!project_data){
            res.status(400).send({type:"RXERROR",message:"Please provide a valid project_uid"})
        }
        // if integratijon_id is one then update discord settings
        if(integration_id=='1'){
            if(input.guild_id==null){
                // if guild_id has not given in input , return error
                return res.status(400).send({type:"RXERROR",message:"guild_id cannot be blank"})
            };
            // find discord settings on the base of project_id or guild_id to get discord_id
            let discord_data = await DiscordIntegrationsSetting.findOne({
                where: {
                    [Op.or]: [
                      { project_id: project_data.id },
                      { guild_id: input.guild_id }
                    ]
                  }
            })
            
            let discord_id = discord_data.id;
            // if discord settings found then update
            if(discord_data){
                await DiscordIntegrationsSetting.update({
                        project_id: project_data.id,
                        guild_id: input.guild_id
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
        // if integratijon_id is 2 then update slack settings
        }else if(integration_id=='2'){
            if(input.slack_team_id == null){
                return res.status(400).send({type:"RXERROR",message:"slack_team_id cannot be blank"})

            }

            let slack_data = await SlackIntegrationsSetting.findOne({
                where: {
                    [Op.or]: [
                      { project_id: project_data.id },
                      { slack_team_id: input.slack_team_id }
                    ]
                  }
            })
            
            let slack_id = slack_data.id;
            
            if(slack_data){
                await SlackIntegrationsSetting.update({
                        project_id: project_data.id,
                        slack_team_id: input.slack_team_id
                        },
                        {
                        where: {
                            id: slack_id
                        }
                    });
                return res.status(200).send({type:"RXSUCCESS",message:"slack setting updated successfully"})
            }else{
                return res.status(400).send({type:"RXERROR",message:"Something went wrong"})
            }

        }else if(integration_id=='3'){ //if integratijon_id is 3 update chatbot settings
            let name = input.name;
            let welcome_message = input.welcome_message;
            let widget_color = input.widget_color;
            let branding_title = input.branding_title;
            let branding_color = input.branding_color;
            let branding_link = input.branding_link;
            let powered_by = input.powered_by
            let primary_color = input.primary_color;
            let text_color_on_primary = input.text_color_on_primary;
            let text_color = input.text_color;
            let branding_text = input.branding_text;

            const chatbotIntegration = await ChatbotIntegrationsSetting.findOne({
                where: { 
                    project_id: project_data.id, 
                }
            });
            // find the chatbot integratio on the base of project_uid
            if (chatbotIntegration) {
                await chatbotIntegration.update(input);
                // return 200
                return res.status(200).send({ type: "RXSUCCESS", message: "Chatbot setting updated successfully" });
            } else {
                // return 400
            return res.status(404).send({ type: "RXERROR", message: "Chatbot setting not found" });
            }
        }
    }
   
}