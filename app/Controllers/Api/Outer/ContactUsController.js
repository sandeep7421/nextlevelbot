let {
  formatJoiError,
  ucfirst,
  isset,
  strlen,
  strpos,
  count,
  authUser,
  in_array,
  rand,
  validateParameters,
  getIpDetail,
  loadEmailTemplate
} = require(baseDir() + "helper/helper");
const {
  User,
  Organization,
  Invitation,
  OrganizationMember,
  sequelize,
  Project,
  ContactUs
} = model("");
const nodemailer = require('nodemailer')
module.exports = class ContactController {
  async ContactUs(req, res) {
    let input = req.body;
    let result = validateParameters(
      ["name", "email", "message"],
      input
    );

    if (result != "valid") {
      let error = formatJoiError(result.errors);
      return res.status(400).send({
        type: "RXERROR",
        message: "Invalid params",
        errors: error,
      });
    }

    // const data = await Contact.create({
    //   name: input.name,
    //   email: input.email,
    //   message: input.message,
    //   intrested_in: input.intrested_in,
    //   project_budget: input.project_budget,
    // });
    
    // if (data) {
      const maildata = config('mail')
      let transporter = nodemailer.createTransport(maildata);

      // send mail with defined transport object
      let htmlMessage = await loadEmailTemplate("contact.ejs", {
        email: input.email,
        name: input.name,
        message: input.message
      });
        let info = await transporter.sendMail({
          from: "noreply@yourgpt.ai", // sender address
          to: "officialrohitjoshi@gmail.com", // list of receivers
          subject: "Contact to admin", // Subject line
          html: htmlMessage, // plain text body
        });
        if (info.messageId) {
          return res.status(200).send({
            type: "RXSUCCESS",
            message: "Thanks for getting in touch, we will get back to you soon!"
          });
        }
    //}
    
  }
};
