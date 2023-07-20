const { Session, Project, SessionMessage, ProjectSetting, WidgetFormField, Organization, ProjectIntegration, ChatbotIntegrationsSetting, ProjectUsage } = require("../../../../Models");
let { formatJoiError, ucfirst, isset, strlen, strpos, count, authUser, in_array, rand, validateParameters, decrypt, checkQueryCount, getProject } = require(baseDir() + "helper/helper");
let Sequelize = require("sequelize");
const { Configuration, OpenAIApi } = require("openai");
const { v4: uuidv4 } = require('uuid');
const Op = Sequelize.Op;
let { getQueryResponse, getQueryAdvanceType } = require(baseDir() + "helper/openai");
let AWS = require('aws-sdk');

module.exports = class ChatbotController {
    /**
     * Create query and answer in session_messages table with session_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async query_chatbot(req, res) {
        // request body
        let input = req.body;
        let session_uid = input.session_uid;
        let widget_uid = input.widget_uid;
        let query = input.query;
        let send_by = "user";
        let parameter = {};
        // check parameter validation
        let result = validateParameters(["session_uid", "widget_uid", "query"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // get chatbot_settings_table data on the base of widget_uid
        let chatbotData = await ChatbotIntegrationsSetting.findOne({
            where: {
                widget_uid: widget_uid
            }
        })
        // if chatbot_setting not found through error
        if (!chatbotData) {
            return res.status(400).send({ type: "RXERROR", message: "Chatbot is removed from Integration. Go to chatbot" })
        }

        // find session on the base of session_uid
        let session_data = await Session.findOne({
            where: {
                session_uid: session_uid,
                status: 'open'
            }
        })
        // if session is not found or session is found but status is closed then through error
        if (!session_data) {
            return res.status(400).send({ type: "RXERROR", message: "This session is closed or inavlid" })
        }

        let project_id = chatbotData.project_id


        let project_uid_data = await Project.findOne({
            where: {
                id: project_id
            }
        });
        let project_uid = project_uid_data.project_uid;


        let data = await Project.findOne({
            include: [
                { model: ProjectSetting, as: 'projectSetting' },
                { model: Organization, as: 'organization' },
            ],
            where: {
                project_uid: project_uid
            },
        })
        // return res.status(200).send({data:data})
        let message = await checkQueryCount(res, project_id)

        if (message) {
            return res.status(400).send({ type: "RXERROR", message: message })
        }
        if (data) {
            let prompt_suffix = isset(data.projectSetting[0]['prompt_suffix'], null);

            let session_id = session_data.id
            await SessionMessage.create({
                session_id: session_id,
                send_by: send_by,
                message: query.concat(prompt_suffix)
            })

            await ProjectUsage.increment('query_count', { by: 1, where: { project_id: project_id } });
            let message;
            if (data.type == 'basic') {
                // get api key from data
                let api_key = data.organization.openai_key;
                message = await getQueryResponse(req, query, api_key, data, session_id);
            } else {
                if (project_uid == null || typeof project_uid == 'undefined') {
                    return res.status(400).send({ type: "RXERROR", "message": "Invalid params", errors: { project_uid: "project_uid cannot be blank" } })
                }
                message = await getQueryAdvanceType(query, project_uid)
                if (message.ok == false) {
                    return res.status(400).send({ type: "RXERROR", message: "Invalid url" })
                }
            }

            send_by = "assistant"
            // create answer in session_messages table
            await SessionMessage.create({
                session_id: session_id,
                send_by: send_by,
                message: message
            })
            return res.status(200).send({ type: "RXSUCCESS", message: "Reponse your query", "data": { "message": message } })
        } else {
            // return 400
            return res.status(400).send({ type: "RXERROR", message: "Incorrect project_uid or hash value" })
        }
    }

    /**
     * enable chatbot
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async enableChatbot(req, res) {
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let integration_id = 3;
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
        // find project data on the base of project_uid to get project_id
        let project_data = await Project.findOne({
            where: {
                project_uid: project_uid
            }
        })
        // if project_data not found through error
        if (!project_data) {
            res.status(400).send({ type: "RXERROR", message: "Please provide a valid project_uid" })
        }
        try {
            // Find project_integration on the base of project_id and integration_id
            let checkData = await ProjectIntegration.findOne({
                where: {
                    project_id: project_data.id,
                    integration_id: integration_id
                }
            })
            // if project_integration data found through error
            if (checkData) {
                return res.status(400).send({ type: "RXERROR", message: "Duplicate data entry" });
            } else {
                // if project_integration data not found then create
                const myAppId = uuidv4();
                let widget_uid = myAppId.substr(0, 8) + myAppId.substr(8, 4) + myAppId.substr(12, 4) + myAppId.substr(16, 4) + myAppId.substr(20);

                let data = await ProjectIntegration.create({
                    project_id: project_data.id,
                    integration_id: integration_id
                })
                if (data) {
                    // Find chatbot settings on the base of project_id
                    let check_chatbot_setting = await ChatbotIntegrationsSetting.findOne({
                        where: {
                            project_id: project_data.id
                        }
                    })
                    // if setting found then return message
                    if (check_chatbot_setting) {
                        return res.status(200).send({ type: "RXSUCCESS", message: "Chatbot enabled successfully" })
                    } else {
                        // if chatbot setting not found then create
                        let chatbotIntegrationsSetting_data = await ChatbotIntegrationsSetting.create({
                            name: project_data.name,
                            project_id: project_data.id,
                            widget_uid: widget_uid,
                            logo: null,
                            welcome_message: "Hi there! I'm your AI Assistant! How can I help you today? 😊",
                            widget_color: "#363eea",
                            widget_text_color: "#fff",
                            branding_title: "YourGPT",
                            branding_color: "#4a4a4a",
                            branding_link: "https://yourgpt.ai/",
                            default_questions: "Using chatbot, I have a question, Just browsing",
                            message_bg_color: "#fff",
                            message_text_color: "#090909",
                            reply_text_color: "#363eea",
                            reply_bg_color: "#fff",

                        })
                        // return 200
                        res.status(200).send({ type: "RXSUCCESS", message: "Chatbot enabled successfully", data: chatbotIntegrationsSetting_data })

                    }
                }
            }

        } catch (err) {
            // return 400
            return res.status(400).send({ type: "RXERROR", message: "Something went wrong", error: err })
        }
    }

    /**
     * Get chatbot setting on the base of project_uid and widget_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getChatbotSetting(req, res) {
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let widget_uid = input.widget_uid;
        // validate input parameters
        let result = validateParameters(["project_uid", "widget_uid"], input);

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
            where: {
                project_uid: project_uid
            }
        })
        // if projects data not found through error
        if (!project_data) {
            res.status(400).send({ type: "RXERROR", message: "Please provide a valid project_uid" })
        }
        // get cahtbot settings on the base of project_id and widget_uid
        let data = await ChatbotIntegrationsSetting.findOne({
            include: [{
                model: WidgetFormField,
                as: 'widget_form_field'
            },
            ],
            where: {
                project_id: project_data.id,
                widget_uid: widget_uid
            }
        })
        if (data) {
            if (data.logo != null) {
                data.logo = "https://assets.yourgpt.ai/chatbots/" + data.logo;
            }
            // return 200
            return res.status(200).send({ type: "RXSUCCESS", message: "Get chatbot setting", data: data })
        } else {
            // return 400
            return res.status(400).send({ type: "RXERROR", message: "Something went wrong" })
        }


    }

    /**
     * Update chatbot settings on the base of project_uid and widget_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async updateChatbotSetting(req, res) {
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let widget_uid = input.widget_uid;
        // validate input parameters
        let result = validateParameters(["project_uid", "widget_uid"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }

        // let name = input.name;
        // let welcome_message = input.welcome_message;
        // let widget_color = input.widget_color;
        // let branding_title = input.branding_title;
        // let branding_color = input.branding_color;
        // let branding_link = input.branding_link;
        // let powered_by = input.powered_by;
        // let default_questions = input.default_questions;

        // Find projects data on the base of project_uid to get project_id
        let project_data = await Project.findOne({
            where: {
                project_uid: project_uid
            }
        })
        // if projects data not found through error
        if (!project_data) {
            res.status(400).send({ type: "RXERROR", message: "Please provide a valid project_uid" })
        }
        // find chatbot settings on the base of project_id and widget_uid
        const chatbotIntegration = await ChatbotIntegrationsSetting.findOne({
            where: {
                project_id: project_data.id,
                widget_uid: widget_uid
            }
        });
        // if chatbot settings found then update         
        if (chatbotIntegration) {
            await chatbotIntegration.update(input);
            // return 200
            return res.status(200).send({ type: "RXSUCCESS", message: "Chatbot setting updated successfully" });
        } else {
            // return 400
            return res.status(404).send({ type: "RXERROR", message: "Chatbot setting not found" });
        }
    }

    /**
     * end chatbot session on the base of project_uid , widget_uid and session_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async endChatbotSession(req, res) {
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        // check parameter validation
        let result = validateParameters(["project_uid", "widget_uid", "session_uid"], input);
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
            where: {
                project_uid: project_uid
            }
        })
        // if project_data not found through error
        if (!project_data) {
            return res.status(400).send({ type: "RXERROR", message: "Please provide a valid Project Uid" })
        }

        let project_id = project_data.id;
        // find chatbot settings on the base of widget_uid and project_id
        let chatbot_setting = await ChatbotIntegrationsSetting.findOne({
            where: {
                project_id: project_id,
                widget_uid: input.widget_uid
            }
        })
        // if chatbot settings not found through error
        if (!chatbot_setting) {
            return res.status(400).send({ type: "RXERROR", message: "Please provide a valid widget_uid" })
        }
        // if chatbot settingb found then close session
        await Session.update({ status: "closed" }, {
            where: {
                project_id: project_id,
                session_uid: input.session_uid
            },
        })
        // return 200
        return res.status(200).send({ type: "RXSUCCESS", message: "Chatbot Session closed successfully" })
    }

    /**
     * upload chatbot setting logo on the base of project_uid and widget_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async uploadLogo(req, res) {
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let widget_uid = input.widget_uid;
        // validate input parameters
        let result = validateParameters(["project_uid", "widget_uid", "logo"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find projects detail on the base of project_uid
        let project_data = await Project.findOne({
            where: {
                project_uid: project_uid
            }
        })
        // if projects data not found through error
        if (!project_data) {
            res.status(400).send({ type: "RXERROR", message: "Please provide a valid project_uid" })
        }
        // find chatbot settings on the base of project_id and widget_uid
        const chatbotIntegration = await ChatbotIntegrationsSetting.findOne({
            where: {
                project_id: project_data.id,
                widget_uid: widget_uid
            }
        });
        // if chatbot settings found then update         
        if (chatbotIntegration) {
            await chatbotIntegration.update(input);
            // return 200
            return res.status(200).send({ type: "RXSUCCESS", message: "Chatbot setting updated successfully" });
        } else {
            // return 400
            return res.status(404).send({ type: "RXERROR", message: "Chatbot setting not found" });
        }
    }


    /**
     * Get signed url
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getSignedUrl(req, res) {
        // Input & validate
        let input = req.body;
        console.log("getSignedUrl input log", input);
        // validate input parameters
        let result = validateParameters(["file_name"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        let fileName = input.file_name;
        fileName = fileName.replace(/ /g, "-");

        AWS.config.update({
            accessKeyId: config("aws").accessKeyId, // Access key ID
            secretAccessKey: config("aws").secretAccessKey, // Secret access key
            region: 'us-east-2' //Region
        });

        // Singed URL
        let filename = Math.floor(Date.now() / 1000) + "-" + Math.floor(Math.random() * 10000) + "-" + fileName
        let modifiedFileName = "chatbots/" + filename;
        let s3 = new AWS.S3({
            signatureVersion: 'v4'
        });

        // Singed
        let signedUrl = s3.getSignedUrl('putObject', {
            Bucket: "assets.yourgpt.ai",
            Key: modifiedFileName,
            Expires: 3600,
            ContentType: 'text/plain',
            ACL     : 'public-read'
        });
        console.log('presigned url: ', signedUrl);

        // Return success
        return res.status(200).send({ "type": "RXSUCCESS", "data": { "url": signedUrl, "filename": filename } });
    }


    /**
     * Like and dislike sessionMessage on the base of id(session_messages id) , session_id and rate(for like add 1 and for dislike add 0)
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async rateMessage(req, res) {
        // request body
        let input = req.body;
        let id = input.id;
        let session_uid = input.session_uid;
        let rate = input.rate;
        // validate input parameters
        let result = validateParameters(["id", "session_uid", "rate"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        let session_data = await Session.findOne({
            where:{
                session_uid:input.session_uid
            }
        })
        if(!session_data){
            return res.status(400).send({ type: "RXERROR", message: "Please provide a valid session_uid" })
        }
        let session_id = session_data.id
        // find the detail of session_messsages on the base of id , session_id and send_by(only assistant message)
        let session_messages = await SessionMessage.findOne({
            where: {
                id: id,
                session_id: session_id,
                send_by: "assistant"
            }
        })
        if (session_messages) {
            // if session_messages detail found then like or dislike
            await SessionMessage.update({ rate: rate }, {
                where: {
                    id: id,
                    session_id: session_id,
                    send_by: "assistant"
                },
            });
            // return 200
            if (rate == 1) {
                // return success response 200
                return res.status(200).send({ type: "RXSUCCESS", message: "You liked this message successfully" })
            } else {
                // return success response 200
                return res.status(200).send({ type: "RXSUCCESS", message: "You disliked this message" })
            }
        } else {
            // return 400
            return res.status(400).send({ type: "RXERROR", message: "Data not found" })
        }
    }

    /**
     * Create widget form field on the base of project_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async createWidgetFormField(req, res) {
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let priority = input?.priority
        // validate input parameters
        let result = validateParameters(["project_uid", "type","name"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        if(typeof priority == 'undefined'){
            priority = 1
        }
        // call getProject function for getting project_id from project_uid
        let project_data = await getProject(res, project_uid);
        let project_id = project_data.id;
        // Check that project setting is found or not 
        let check_chatbot_setting = await ChatbotIntegrationsSetting.findOne({
            where: {
                project_id: project_id
            }
        })
        
        // If chatbot setting found then create widget form field 
        if (check_chatbot_setting) {
            if (priority) {
                const priorities = await WidgetFormField.findOne({
                    where : {
                        widget_id: check_chatbot_setting.id,
                    },
                    order : [["id","desc"]]
                }) 
                if (priorities) {
                    priority = priorities.priority + 1
                }
            }else{
                priority = priority
            }
            let data = await WidgetFormField.create({
                name: input.name,
                widget_id: check_chatbot_setting.id,
                type: input.type,
                options: input.options,
                required: input.required,
                validation_rules: input.validation_rules,
                priority : priority
            })
            // return 200 success response
            return res.status(200).send({ type: "RXSUCCESS", messages: "Data created successfully", data: data })
        }
        // if chatbot setting not found then return error 
        return res.status(400).send({ type: "RXERROR", messages: "Chatbot setting not found" })
    }

    /**
     * Update widget form field data on the base of project uid and form_field_id
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async updateWidgetFormField(req, res) {
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let form_field_id = input.form_field_id;
        // validate input parameters
        let result = validateParameters(["project_uid", "form_field_id"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // call getProject function to get project_id on the base of project_uid
        let project_data = await getProject(res, project_uid);
        let project_id = project_data.id;
        // check that project chatbot setting found or not
        let check_chatbot_setting = await ChatbotIntegrationsSetting.findOne({
            where: {
                project_id: project_id
            }
        })
        // if chatbot setting is found then find widget form field on the base of id and widget_id
        if (check_chatbot_setting) {
            let check_widget_form_field = await WidgetFormField.findOne({
                where: {
                    id: form_field_id,
                    widget_id: check_chatbot_setting.id
                }
            })
            // if widget_form_field is found then update
            if (check_widget_form_field) {
                await check_widget_form_field.update(input);
                return res.status(200).send({ type: "RXSUCCESS", message: "Widget form field updated successfully" })
            } else {
                // if widget_form_field not found then return error
                return res.status(400).send({ type: "RXERROR", message: "Widget form field not found" })
            }
        } else {
            // return 400 error
            return res.status(400).send({ type: "RXERROR", message: "Chatbot setting not found" })
        }

    }

    /**
     * Delete widget form field on the base of project_uid and the id of form_widget_form_fields
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async deleteWidgetFormField(req, res) {
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let form_field_id = input.form_field_id;
        // validate input parameters
        let result = validateParameters(["project_uid", "form_field_id"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // call getProject function to get project_id on the base of project_uid
        let project_data = await getProject(res, project_uid);
        let project_id = project_data.id;
        // check project chatbot setting is found or not
        let check_chatbot_setting = await ChatbotIntegrationsSetting.findOne({
            where: {
                project_id: project_id
            }
        })
        // if chatbot setting is found then check widget_form_field is found or not on the base of widget_form_field id and widget_id
        if (check_chatbot_setting) {
            // if widget_form_field is found then delete
            let form_fields_data = await WidgetFormField.destroy({
                where: {
                    id: form_field_id,
                    widget_id: check_chatbot_setting.id
                }
            })
            if (form_fields_data) {
                return res.status(200).send({ type: "RXSUCCESS", message: "Widget form field deleted successfully" })
            } else {
                // if widget form field not found then return error
                return res.status(400).send({ type: "RXERROR", message: "Widget form field not found" })
            }
        } else {
            // return error
            return res.status(400).send({ type: "RXERROR", message: "Chatbot setting not found" })
        }
    }
}