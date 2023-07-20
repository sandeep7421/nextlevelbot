const { Session, ProjectDomain, Project, SessionMessage, SessionLead, ShareLinkIntegrationSetting, SessionWebsiteNavigation, User, sequelize, Contact } = require("../../../../Models");
let { formatJoiError, isset, validateParameters, getIpDetail, createJwtToken, loadEmailTemplate,getProjectData } = require(baseDir() + "helper/helper");
let Sequelize = require("sequelize");
const Op = Sequelize.Op;
let sha256 = require("sha256");
let moment = require("moment");
let Joi = require("@hapi/joi");
let md5 = require("md5");
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer')

module.exports = class SessionController {
    async createShareLinkSession(req, res) {
        // request body
        let input = req.body;

        let device_type = input.device_type;
        let ip_address = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.connection.remoteAddress;

        // check parameter validation
        let result = validateParameters(["hash", "device_type", "platform"], input);
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

        // find chatbot settings data
        let shareLink_setting = await ShareLinkIntegrationSetting.findOne({
            where: {
                hash: input.hash
            }
        })
        if (!shareLink_setting) {
            return res.status(400).send({ type: "RXERROR", message: "Please provide a valid shareLink_setting hash" })
        }
        const project_id = shareLink_setting.project_id

        const myAppId = uuidv4();
        let session_uid = myAppId.substr(0, 8) + myAppId.substr(8, 4) + myAppId.substr(12, 4) + myAppId.substr(16, 4) + myAppId.substr(20);
        // let hash =  sha256("YOURGPT_SECRET" + project_uid + "-" + Math.floor(Date.now() / 1000) + Math.floor(Date.now() / 1000));

        let current_date = moment().format("YYYY-MM-DD HH:mm:ss");

        let session_data = await Session.create({
            integration_id: 8,
            status: 'open',
            device_type: device_type,
            platform: input.platform,
            ip: ip_address,
            country: country,
            project_id: project_id,
            session_uid: session_uid
        })

        const workSpaceData = await Project.findOne({
            where : {
                id : session_data.project_id
            }
        })

        session_data.dataValues.work_space = {
            name:workSpaceData.name
        }

        let jwt_data = {
            "purpose":"qamaster",
            "project_id": project_id,
            "session_id": session_data.id,
            "session_uid": session_data.session_uid,
            "created_at": current_date,
            "name":workSpaceData.name,
            "organization_id":workSpaceData.organization_id
        };

        const jwtToken = await createJwtToken(jwt_data);

        let arr = session_data.dataValues

        arr.token = jwtToken

        return res.status(200).send({ type: "RXSUCCESS", message: "WorkSpace Session created successfully", data: arr });   
    }

    async getShareLinkMessagesBySessionId(req, res) {
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

    async getShareLinkDetailBySessionId(req, res) {
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
                    model: Contact,
                    as: 'contact'
                },{
                    model: SessionMessage,
                    as:"session_messages"
                }],
                where: {
                    session_uid: session_uid
                },
        })
        if (data) {
            // return success
            return res.status(200).send({ type: "RXSUCCESS", message: "Session detail", data: data })
        } else {
            // return error
            return res.status(400).send({ type: "RXERROR", message: "Please provide a valid session_uid" })
        }
    }
}