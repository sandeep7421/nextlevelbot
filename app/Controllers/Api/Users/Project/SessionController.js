const { Session, ProjectDomain, Project, SessionMessage, ChatbotIntegrationsSetting, SessionLead, WidgetFormField, SessionWebsiteNavigation, User, sequelize, Contact,ShareLinkIntegrationSetting } = require("../../../../Models");
let { formatJoiError, isset, validateParameters, getIpDetail, createJwtToken, loadEmailTemplate } = require(baseDir() + "helper/helper");
let Sequelize = require("sequelize");
const Op = Sequelize.Op;
let sha256 = require("sha256");
let moment = require("moment");
let Joi = require("@hapi/joi");
let md5 = require("md5");
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer')
const markdown = require('markdown-it')()
module.exports = class SessionController {
    /**
     * Create public session
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async createSession(req, res) {
        // request body
        let input = req.body;
        let integration_id = input.integration_id;
        let device_type = input.device_type;
        let ip_address = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        // let country = input.country;
        let project_uid = input.project_uid;
        // check parameter validation
        let result = validateParameters(["project_uid", "integration_id", "device_type", "platform"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        let ip_detail = await getIpDetail(ip_address)
        let country;
        if (typeof ip_detail === 'undefined' || ip_detail === null) {
            country = null
        } else {
            country = ip_detail.country
        }        // Get project data by project_uid
        let project_data = await Project.findOne({
            where: {
                project_uid: project_uid
            }
        })

        const myAppId = uuidv4();
        let session_uid = myAppId.substr(0, 8) + myAppId.substr(8, 4) + myAppId.substr(12, 4) + myAppId.substr(16, 4) + myAppId.substr(20);
        // let hash =  sha256("YOURGPT_SECRET" + project_uid + "-" + Math.floor(Date.now() / 1000) + Math.floor(Date.now() / 1000));
        if (project_data) {
            let session_data = await Session.create({
                integration_id: integration_id,
                status: 'open',
                device_type: device_type,
                ip: ip_address,
                country: country,
                platform: input.platform,
                project_id: project_data.id,
                session_uid: session_uid
            })
            return res.status(200).send({ type: "RXSUCCESS", message: "Session created successfully", data: session_data });

        } else {
            return res.status(400).send({ type: "RXERROR", message: "Invalid project uid" });
        }
    }
    /**
     * get all session messages by project_uid (project_uid->project_id->session_id->session_messages)
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getSessionMessagesById(req, res) {
        // request body
        const input = req.body
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

        let project_data = await Project.findOne({
            where: {
                project_uid: input.project_uid
            }
        })
        if (!project_data) {
            return res.status(400).send({ type: "RXERROR", message: "Please provide a valid project_uid" })
        }
        let project_id = project_data.id;

        const data = await Session.findOne({
            include: [
                {
                    model: SessionMessage,
                    as: "message"
                },
                {
                    model: SessionWebsiteNavigation,
                    as: "SessionWebsiteNavigation"
                }
            ],
            where: {
                project_id: project_id,
            }
        })
        if (!data) {
            return res.status(400).send({
                type: "RXERROR",
                message: "Session not found",
            });
        }

        return res.status(200).send({
            type: "RXSUCCESS",
            message: "Session detail",
            data: data
        })
    }
    /**
     * get all project session by project_uid 
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getProjectSession(req, res) {
        // request body
        const input = req.body
        let orderBy = isset(input.orderBy, "ASC");
        let limit = parseInt(isset(input.limit, 10));
        let offset = 0 + (isset(input.page, 1) - 1) * limit;
        if (offset < 1) {
            offset = 0;
        }
        let project_uid = input.project_uid
        let status = isset(input.status, null);
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
        // Get project data by project_uid
        let project_data = await Project.findOne({
            where: {
                project_uid: project_uid
            }
        })
        if (!project_data) {
            return res.status(400).send({ type: "RXERROR", message: "Please provide a valid project_uid" })
        }
        let project_id = project_data.id;
        let sessionWhereClause = { project_id: project_id };
        if (status != null) {
            sessionWhereClause.status = status;
        }

        const data = await Session.findAndCountAll({
            attributes:[
                'id' ,
                'project_id',
                'session_uid',
                'integration_id' ,
                'status',
                'device_type' ,
                'platform' ,
                'ip' ,
                'country' ,
                'contact_id',
                'created_at',
                'updated_at',
                [Sequelize.literal("(Select count(id) from session_messages where session_messages.session_id=Session.id and type=0)"), "total_messages"],
                [Sequelize.literal("(Select count(id) from session_messages where session_messages.session_id=Session.id and type=0 and seen='0')"), "total_unseen"],
                [Sequelize.literal("(Select message from session_messages where session_messages.session_id=Session.id limit 1 )"), "first_message"],
                [Sequelize.literal("(Select message from session_messages where session_messages.session_id=Session.id limit 1 offset 1)"), "reply_message"],
            ],
            where: sessionWhereClause,
            order: [['id', orderBy]],
            limit: limit,
            offset: offset,
        })
        if (data['rows'].length == 0) {
            return res.status(400).send({
                type: "RXERROR",
                message: "Session not found",
            });
        }

        return res.status(200).send({
            type: "RXSUCCESS",
            message: "Session detail",
            total: data.count,
            data: data['rows'],
        })
    }
    
    /**
     * end session on the base of project_uid and session_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async endSession(req, res) {
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let session_uid = input.session_uid;
        let status = "closed"
        // check parameter validation
        let result = validateParameters(["project_uid", "session_uid"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // Get project data by project_uid to get project_id
        let project_data = await Project.findOne({
            where: {
                project_uid: project_uid
            }
        })
        let project_id = project_data.id;
        // if projects not found retuen errror
        if (!project_data) {
            return res.status(400).send({ type: "RXERROR", message: "Please provide a valid project_uid" })
        }
        // end session on the base of project_id and session_uid
        const session_data = await Session.update({ status: "closed" }, {
            where: {
                project_id: project_id,
                session_uid: session_uid
            },
        })
        if (session_data) {
            // return 200
            return res.status(200).send({ type: "RXSUCCESS", message: "Session closed successfully" })
        } else {
            // return 400
            return res.status(400).send({ type: "RXERROR", message: "Session not found" })
        }



    }

    /**
     * Create chatbot session
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async createChatbotSession(req, res) {
        // request body
        let input = req.body;

        let device_type = input.device_type;
        let ip_address = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        let project_uid = input.project_uid;

        // check parameter validation
        let result = validateParameters(["project_uid", "widget_uid", "device_type", "platform"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        let ip_detail = await getIpDetail(ip_address)
        let country;
        if (typeof ip_detail === 'undefined' || ip_detail === null) {
            country = null
        } else {
            country = ip_detail.country
        }
        // get projects data on the base of project_uid to get project_id
        let project_data = await Project.findOne({
            where: {
                project_uid: project_uid
            }
        })
        // if projects data not found then through error
        if (!project_data) {
            return res.status(400).send({ type: "RXERROR", message: "Please provide a valid project_uid" })
        }

        let project_id = project_data.id;
        // find chatbot settings data
        let chatbot_setting = await ChatbotIntegrationsSetting.findOne({
            where: {
                project_id: project_id,
                widget_uid: input.widget_uid
            }
        })
        if (!chatbot_setting) {
            return res.status(400).send({ type: "RXERROR", message: "Please provide a valid widget_uid" })

        }

        const myAppId = uuidv4();
        let session_uid = myAppId.substr(0, 8) + myAppId.substr(8, 4) + myAppId.substr(12, 4) + myAppId.substr(16, 4) + myAppId.substr(20);
        // let hash =  sha256("YOURGPT_SECRET" + project_uid + "-" + Math.floor(Date.now() / 1000) + Math.floor(Date.now() / 1000));

        let data = await Project.findOne({
            where: {
                id: project_id
            }
        });
        let current_date = moment().format("YYYY-MM-DD HH:mm:ss");

        if (data) {
            let session_data = await Session.create({
                integration_id: 3,
                status: 'open',
                device_type: device_type,
                platform: input.platform,
                ip: ip_address,
                country: country,
                project_id: project_id,
                session_uid: session_uid
            })

            await SessionMessage.create({
                session_id: session_data.id,
                send_by: "assistant",
                message: "🤖 Hi there! I'm your friendly ChatBot! How can I help you today? 😊"
            });

            if (input.data) {
                let formattedData = "";
                input.data.forEach(entry => {
                    const fieldName = entry.field_name;
                    const value = entry.value;
                    formattedData += `${fieldName}\n${value}\n\n`;
                });
                // console.log(formattedData);

                await SessionMessage.create({
                    session_id: session_data.id,
                    type: 2,
                    message: formattedData
                });

                const contactData = input.data.reduce((result, item) => {
                    result[item.field_type] = item.value;
                    return result;
                }, {});

                // console.log(contact_detail);

                let check_contact;
                let contact_id = 0;
             
                for (let i = 0; i < input.data.length; i++) {
                    const field = input.data[i];
                    if (field.field_type === "email") {
                        contactData.email = field.value;
                        check_contact = await Contact.findOne({
                            where: {
                                email: field.value
                            }
                        });
                        if (check_contact) {
                            contact_id = check_contact.id
                        }
                    } else if (field.field_type === "phone") {
                        contactData.phone = field.value;
                        check_contact = await Contact.findOne({
                            where: {
                                phone: field.value
                            }
                        });
                        if (check_contact) {
                            contact_id = check_contact.id
                        }
                    }
                    else if (field.field_type === "ext_user_id") {
                        contactData.ext_user_id = field.value;
                        check_contact = await Contact.findOne({
                            where: {
                                ext_user_id: field.value
                            }
                        });
                        if (check_contact) {
                            contact_id = check_contact.id
                        }
                    }

                }

                if (contact_id == 0) {
                    let contact = await Contact.create(contactData);
                    contact_id = contact.id;
                }

                await Session.update({
                    contact_id: contact_id,
                },
                    {
                        where: {
                            id: session_data.id
                        }
                    });

            }
            // ************************

            let chatbot_setting = await ChatbotIntegrationsSetting.findOne({
                where: {
                    project_id: project_id
                }
            })
            let project_domain = await ProjectDomain.findAll({
                attributes: ["domain"],
                where: {
                    project_id: project_id
                }
            })
            let domain_str = project_domain.map(item => item.domain).join(", ");

            let jwt_data = {
                "organization_id": project_data.organization_id,
                "project_uid": project_uid,
                "project_id": project_id,
                "widget_uid": chatbot_setting.widget_uid,
                "product": data.name,
                "session_id": session_data.id,
                "session_uid": session_data.session_uid,
                "created_at": current_date,
                "allowed_domains": domain_str,
                "prompt":  chatbot_setting.base_prompt,
                "updated_at": chatbot_setting.updated_at
            };

            const jwtToken = await createJwtToken(jwt_data);

            let arr = session_data.dataValues

            arr.token = jwtToken

            return res.status(200).send({ type: "RXSUCCESS", message: "Chatbot Session created successfully", data: arr });

        } else {
            return res.status(400).send({ type: "RXERROR", message: "Invalid project uid" });
        }
    }

    /**
     * It will return session_count and query_count of any project
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getStats(req, res) {
        // request body
        let input = req.body;
        let project_uid = input.project_uid;
        let from = isset(input.from, null);
        let to = isset(input.to, null);
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
        // find projects on the base of project_uid to get project_id
        let project_data = await Project.findOne({
            where: {
                project_uid: project_uid
            }
        })
        // if projects not found return error
        if (!project_data) {
            return res.status(400).send({ type: "RXERROR", message: "Please provide a valid project_uid" })
        }

        let project_id = project_data.id;

        let session_query = 'SELECT COUNT(*) FROM session WHERE session.project_id = Project.id';
        let session_messages_query = 'SELECT COUNT(*) FROM session_messages JOIN session ON session.id = session_messages.session_id WHERE session.project_id = Project.id and session_messages.send_by = "user"';
        let session_document = 'SELECT COUNT(*) FROM project_files where project_files.project_id = Project.id'
        let session_url = 'SELECT COUNT(*) FROM project_urls where project_urls.project_id = Project.id'
        let session_messages_like = `SELECT COUNT(case when rate = '1' then 1 else null end) FROM session_messages JOIN session ON session.id = session_messages.session_id WHERE session.project_id = Project.id and session_messages.send_by = "assistant"`;
        let session_messages_dislike = `SELECT COUNT(case when rate = '0' then 1 else null end) FROM session_messages JOIN session ON session.id = session_messages.session_id WHERE session.project_id = Project.id and session_messages.send_by = "assistant"`;
        let session_messages_no_feedback = `SELECT COUNT(case when rate IS null then 1 else null end) FROM session_messages JOIN session ON session.id = session_messages.session_id WHERE session.project_id = Project.id and session_messages.send_by = "assistant"`;
        
        
        if (from !== null && to !== null) {
            session_query = session_query + ` AND session.created_at BETWEEN '${from}' AND '${to}'`;
            session_messages_query = session_messages_query + ` AND session_messages.created_at BETWEEN '${from}' AND '${to}'`;
            session_document = session_document + ` AND project_files.created_at BETWEEN '${from}' AND '${to}'`;
            session_url = session_url + ` AND project_urls.created_at BETWEEN '${from}' AND '${to}'`;
            session_messages_like = session_messages_like + ` AND session_messages.created_at BETWEEN '${from}' AND '${to}'`;
            session_messages_dislike = session_messages_dislike + ` AND session_messages.created_at BETWEEN '${from}' AND '${to}'`;
            session_messages_no_feedback = session_messages_no_feedback + ` AND session_messages.created_at BETWEEN '${from}' AND '${to}'`;
            
        }

        let session_count = '(' + session_query + ')'
        let messages_count = '(' + session_messages_query + ')'
        let document_count = '(' + session_document + ')'
        let url_count = '(' + session_url + ')'
        let like_count = '(' + session_messages_like + ')'
        let dislike_like_count = '(' + session_messages_dislike + ')'
        let no_feedback_count = '(' + session_messages_no_feedback + ')'

        let data = await Project.findAll({
            attributes: [
                [Sequelize.literal(session_count), 'total_conversation'],
                [Sequelize.literal(messages_count), 'total_messages'],
                [Sequelize.literal(document_count), 'total_documents'],
                [Sequelize.literal(url_count), 'total_links'],
                [Sequelize.literal(like_count), 'like'],
                [Sequelize.literal(dislike_like_count), 'dislike'],
                [Sequelize.literal(no_feedback_count), 'no_feedback'],
                [Sequelize.literal(session_count), 'session_count'],
                [Sequelize.literal(messages_count), 'query_count']
            ],
            where: {
                id: project_id
            },
            group: ['Project.id'],
        });
        data = JSON.parse(JSON.stringify(data[0]))
        let total_messages = data.total_messages
        let total_conversation = data.total_conversation
        let avg_message_conversation = Number((total_messages/total_conversation).toFixed(1));
        data.avg_message_conversation = avg_message_conversation ? avg_message_conversation : 0

        if (data) {
            // return 200
            return res.status(200).send({ type: "RXSUCCESS", data: [data] });
        }
        // return 400
        return res.status(400).send({ type: "RXERROR", message: "Something went wrong" });
    }

    /**
     * get all session messages on the base of session_uid
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getSessionMessagesBySessionId(req, res) {
        // request body
        let input = req.body;
        let session_uid = input.session_uid;
        let orderBy = isset(input.orderBy, "ASC");
        let limit = parseInt(isset(input.limit, 10));
        let offset = 0 + (isset(input.page, 1) - 1) * limit;
        if (offset < 1) {
            offset = 0;
        }
        // check parameter validation
        let result = validateParameters(["session_uid"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find session on the base of session_uid to get session_id
        let session_data = await Session.findOne({
            where: {
                session_uid: session_uid
            }
        });
        // if session data not found the through error
        if (!session_data) {
            return res.status(400).send({ type: "RXERROR", message: "Invalid session_uid" })
        }
        let session_id = session_data.id;
        // find session_messages on the base of session_id
        let session_messages_data = await SessionMessage.findAndCountAll({
            where: {
                session_id: session_id
            },
            order: [['id', orderBy]],
            limit: limit,
            offset: offset,
        })
        if (session_messages_data) {
            // return 200
            return res.status(200).send({ type: "RXSUCCESS", message: "Get session messages data", total: session_messages_data.count, data: session_messages_data['rows'] })
        } else {
            // return 400
            return res.status(400).send({ type: "RXERROR", message: "Something went wrong" })
        }
    }

    async SessionWebsiteNavigation(req, res) {
        const input = req.body
        // check parameter validation
        let result = validateParameters(["session_uid", "url"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        // find session on the base of session_uid to get session_id
        let session_data = await Session.findOne({
            where: {
                session_uid: input.session_uid
            }
        });
        // if session data not found the through error
        if (!session_data) {
            return res.status(400).send({ type: "RXERROR", message: "Invalid session_uid" })
        }
        let session_id = session_data.id;

        try {
            const result = await SessionMessage.create({
                type: 1,
                session_id: session_id,
                message: input.url
            })
            return res.status(200).send({
                type: "RXSUCCESS",
                message: "SessionWebsiteNavigation details added successfully",
                data: result
            });

        } catch (error) {
            console.log(error);
            return res.status(400).send({
                type: "RXERROR",
                message: "Something went to be wrong",
            });
        }
    }


    async getSessionDetailBySessionId(req, res) {
        // request body
        let input = req.body;
        let session_uid = input.session_uid;
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
        // find sessions detail on the base of session_uid with session_leads
        let data = await Session.findOne({
            include: [{
                model: SessionLead,
                as: 'session_lead',
                include: [{
                    model: WidgetFormField,
                    as: "widget_form_field",
                    paranoid: false
                }]

            },
            {
                model: Contact,
                as: 'contact'
            },{
                model: Project,
                as : "project_session"
            }],
            where: {
                session_uid: session_uid
            },
        })
        const project_id = data.project_id
        const session_id = data.id
        let current_date = moment().format("YYYY-MM-DD HH:mm:ss");
        let jwt_data = {
            "purpose":data.project_session.purpose,
            "project_id": project_id,
            "session_id": session_id,
            "session_uid": session_uid,
            "created_at": current_date,
            "name":data.project_session.name,
            "organization_id":data.project_session.organization_id
        };
        const jwtToken = await createJwtToken(jwt_data);
        data.dataValues.token = jwtToken
        if (data) {
            // return success
            return res.status(200).send({ type: "RXSUCCESS", message: "Session detail", data: data })
        } else {
            // return error
            return res.status(400).send({ type: "RXERROR", message: "Please provide a valid session_uid" })
        }
    }

    async getSessionNavigationLink(req, res) {
        let input = req.body;
        let limit = parseInt(isset(input.limit, 10));
        let orderBy = isset(input.orderBy, "DESC");
        let offset = 0 + (isset(input.page, 1) - 1) * limit;
        if (offset < 1) {
            offset = 0;
        }
        let data = await SessionWebsiteNavigation.findAndCountAll({
            order: [
                ['id', orderBy]
            ],
            limit: limit,
            offset: offset

        });
        if (data) {
            return res.status(200).send({ type: "RXSUCCESS", message: "Session navigation link", total: data.count, data: data['rows'] })
        }
        return res.status(400).send({ type: "RXERROR", message: "Data not found" })
    }

    async sendChatBotConversationOnEmail() {
        // request body
        // find session on the base of session_uid to get session_id

        let session_data = await Session.findAll({
            include : [{
                model : ChatbotIntegrationsSetting,
                as : "ChatbotIntegrationsSetting"
            }],
            where: {
                is_notified: "0",
                created_at : {
                    [Op.and] :{
                        [Op.lte]: Sequelize.literal(`NOW() - INTERVAL ${60 * 10} second`),
                        [Op.gte]: Sequelize.literal(`NOW() - INTERVAL 24 hour`)
                    }
                }
            }
        });
        // if session data not found the through error
        if (session_data.length > 0) {
            let session_id
            let notify_to = null
            try {
                for(let x=0;x<=session_data.length-1;x++){
                    let item    = session_data[x];
                    session_id  = item.id;

                    let session_messages_data = await SessionMessage.findAndCountAll({
                        where: {
                            session_id: session_id
                        },
                    })
                    notify_to = item.ChatbotIntegrationsSetting.notify_to

                    if (notify_to) {
                        let recipients  =  notify_to.split(',');
                        let currentTime =  moment(item.createdAt).utc().format('dddd, MMMM DD, YYYY, [at] HH:mm [(GMT+0)]');
                        let subject= `New conversation started on your chatbot at  ${currentTime}`
                        if(session_messages_data['rows'].length>2){
                            await this.sendBulkEmails(recipients,subject,session_messages_data['rows'],currentTime);
                            await Session.update({is_notified : "1"},{
                                where: {
                                    id: session_id
                                },
                            })
                        }
                    
                        console.log(`Mail sent to this recipients ${notify_to}`);
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }

        return true;
    }

    async sessionMessageSeen(req, res) {
        let input = req.body;
        let session_uid = input.session_uid;

        let result = validateParameters(["session_uid"], input);

        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }

        const sessionData = await Session.findOne({
            where : {
                session_uid : session_uid
            }
        }) 

        if (!sessionData) {
            return res.status(400).send({
                type: "RXERROR",
                message: "Session not found"
            });
        }

        const session_id = sessionData.id
        SessionMessage.update({ seen: '1' }, { where: { session_id: session_id } })
            .then((result) => {
                console.log(`Updated ${result[0]} rows`);
            })
            .catch((err) => {
                console.error('Error updating rows:', err);
            });

        return res.status(200).send({
            type: "RXSUCCESS",
            message: "Updated successfully"
        });
    }


  
    // Function to send a single email
    async sendEmail(recipient,subject,session_messages_data, currentTime) {
        const maildata = config('mail')
        // console.log(maildata);
        let transporter = nodemailer.createTransport(maildata);
        // send mail with defined transport object
        let htmlMessage = await loadEmailTemplate("emailConversation.ejs", {
            data: session_messages_data,
            currentTime: currentTime,
            markdown : markdown
        });
        // Update the 'to' field of the mail options
        // mailOptions.to = recipient;
        // Send the email and return a promise
        return await transporter.sendMail({
            from:  '"YourGPT Chatbot" <chatbot@yourgpt.ai>',
            to: recipient,  // list of receivers
            subject: subject, // Subject line | "Missed chat on tawk.to at Sunday, May 14, 2023, at 08:16 (GMT+0)"
            html: htmlMessage, // plain text body
        });
    }
    
    //   Function to send emails to recipients in bulk
    async sendBulkEmails(recipients,subject,session_messages_data,currentTime) {
        const result = await this.sendEmail(recipients,subject,session_messages_data,currentTime);
        console.log(`Email sent to ${recipients}:`, result.response);
        return result;
    }


} 


 