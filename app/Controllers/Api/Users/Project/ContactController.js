const { User, UserSession,Session, Organization, Invitation,Contact, ForgetPassword, OrganizationMember, EmailVerification } = require("../../../../Models");
let sha256 = require("sha256");
let moment = require("moment");
let Joi = require("@hapi/joi");
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer')
// let { syncContactToBrevo } = require(baseDir() + "helper/syncContactToBrevo");
let { formatJoiError, ucfirst, rand, validateParameters, getIpDetail, loadEmailTemplate, createJwtToken } = require(baseDir() + "helper/helper");
// let { sessionMiddleware } = require('../../Middlewares/Auth')
let Sequelize = require("sequelize");
const { Op } = require("sequelize")
const jwt = require('jsonwebtoken');
module.exports = class ContactController {
    async createContact(req, res) {
        // request body
        let input = req.body;
        let session_id = input.session_id;

        let data = await Contact.create({
            name: input.name,
            external_user_id: input.external_user_id,
            email: input.email,
            phone: input.phone,
            company: input.compan,
            country: input.country,
            city: input.city,
            region: input.region,
            tags: input.tags
        })

        let contact_id = data.id;

        if(session_id){
            await Session.update({ contact_id: contact_id }, { where: { id: session_id } })

        }

        if (data) {
            return res.status(200).send({ type: "RXSUCCESS", message: "Visitor contacts", data: data });
        }
        return res.status(400).send({ type: "RXERROR", message: "Unable to create visitor contacts" });
    }

    async updateContact(req, res) {
        // request body
        let input = req.body;
        // validate input parameters
        let result = validateParameters(["id"], input);
        if (result != 'valid') {
            let error = formatJoiError(result.errors);
            return res.status(400).send({
                type: "RXERROR",
                message: "Invalid params",
                errors: error
            });
        }
        let data = await Contact.update(input, {
            where: {
                id: input.id
            }
        })
        if (data) {
            // return 200
            return res.status(200).send({
                type: "RXSUCCESS",
                message: "Data updated successfully"
            })
        }
        // return 400
        return res.status(400).send({
            type: "RXERROR",
            message: "Unable to update data"
        })
    }
}