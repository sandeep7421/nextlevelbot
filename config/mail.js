module.exports = {
    host: env("MAIL_HOST",""),
    port: env("MAIL_PORT",""),
    secure: env("MAIL_SECURE",false), // true for 465, false for other ports
    auth: {
      user: env("MAIL_USERNAME",""), // generated ethereal user
      pass: env("MAIL_PASSWORD",""), // generated ethereal password
    },
}