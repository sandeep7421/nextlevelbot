const { User, UserSession, Organization, Invitation,Subscriber,ForgetPassword,OrganizationMember,EmailVerification } = require("../../../../Models");
let sha256 = require("sha256");
let moment = require("moment");
let Joi = require("@hapi/joi");
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer')
let { formatJoiError, ucfirst, isset, strlen, strpos, count, authUser, in_array, rand, validateParameters, getIpDetail,loadEmailTemplate,createJwtToken,notifyOnDiscord } = require(baseDir() + "helper/helper");
// let { sessionMiddleware } = require('../../Middlewares/Auth')
let Sequelize = require("sequelize");
const { Op } = require("sequelize")
const jwt = require('jsonwebtoken')
module.exports = class UserController {
  async socialLogin(req, res) {

    let input = req.body;
    let result = validateParameters(["firebase_uid"], input);

    if (result != 'valid') {
      let error = formatJoiError(result.errors);
      return res.status(400).send({
        type: "RXERROR",
        message: "Invalid params",
        errors: error
      });
    }

    // Input params
    let firebase_uid = isset(input.firebase_uid, "");
    let username = isset(input.username, "");
    let email = isset(input.email, "");
    let name = isset(input.name, "");
    let type = isset(input.type);
    // let country = isset(input.country);
    let source = isset(input.source, "android");
    let version = isset(input.version);
    let device_info = isset(input.device_info);
    let ip_address = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    let hash = isset(input.hash, "");

    let user = {};
    let responseMessage = "";

    let ip_detail = await getIpDetail(ip_address)
    let country;
    if(typeof ip_detail === 'undefined' || ip_detail === null){
      country = null
    } else {
      country = ip_detail.country
    }
    // Get the user count
    let userData = await User.findOne({
      where: { firebase_uid: firebase_uid },
    });
    let newAccount=null
    if (userData == null) {
      if (typeof email != "undefined" && email != null) {
        await this.checkAlreadyExists({ email: email }, res);
      }

      // Create username
      username = await this.createUsername(email);
      if (name == "") {
        name = username;
      }

      user = await User.create({
        name: name,
        email: email,
        username: username.replace(/[^0-9A-Za-z\_]+/gm, ""),
        firebase_uid: firebase_uid,
        country: country,
        type: type,
        email_verified: '1'
      });

      const strdata = `New User registered: \`\`\`user_id = ${user.id} , name = ${user.name}, name = ${user.email},country  = ${user.country}\`\`\``
      await notifyOnDiscord(strdata)

      let invitation = await Invitation.findOne({
        where: {
          hash: hash
        }
      });

      if (invitation == null) {
        let organization=await Organization.create({
          created_by: user.id,
          name: "Default",
          openai_key: input.openai_key
        })
        await OrganizationMember.create({
          role: "owner",
          user_id: user.id,
          organization_id:organization.id
        });
      }
      responseMessage = "Account Created Sucessfully";
      newAccount=true;
    } else {

      user = await User.findOne({ where: { firebase_uid: firebase_uid } });
      responseMessage = "Login Sucessfully"
      newAccount=true;
    }

    let user_id = user.id;

    let token = sha256(
      "YOUR_GPT" + user.id + "-" + Math.floor(Date.now() / 1000)
    );

    let data = {
      "id": user.id,
      "name": name,
      "email": email,
      "username": user.username,
      "firebase_uid": firebase_uid,
      "is_blocked": user.is_blocked,
      "type": user.type,
      "country": user.country,
      "created_at": user.createdAt,
      "newAccount":newAccount,
      "session_token":token
    };

    data.user_id = user_id;
    // expire old session
    try {
      await UserSession.update(
        {
          expires_at: Sequelize.literal("now()"),
        },
        {
          where: {
            user_id: user_id,
          },
        }
      );

      // create new
      await UserSession.create({
        user_id: user_id,
        token: token,
        fcm_token: firebase_uid,
        source: source,
        device_info: device_info,
        ip_address: ip_address,
        country:country,
        version: version,
        expires_at: moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss"),
        created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      });

      const jwtToken = await createJwtToken(data)

      data.token = jwtToken;
      let contactData = {
        userid:user_id,
        firstname:user.name,
        country:user.country,
        email:user.email,
      }

      return res.send({
        "type": "RXSUCCESS",
        "message": responseMessage,
        "data": data
      });
    } catch (e) {
      console.log("this is catch block", e);
      return res.status(400).send({
        type: "RXERROR",
        message: "sometihing went wrong",
      });
    }


  }

  async register(req, res) {

    let input = req.body;
    let result = validateParameters(["name", "phone", "email"], input);
    if (result != 'valid') {
      let error = formatJoiError(result.errors);
      return res.status(400).send({
        type: "RXERROR",
        message: "Invalid params",
        errors: error
      });
    }
    
    try {
        
      // create user
      let data = await User.create({
        name: input.name,
        email: input.email,
        phone: input.phone
      });

      return res.status(200).send({
        type: "RXSUCCESS",
        message: "Registered Successfully",
        data: data
      })
    }
    catch (error) {
      console.log(error);
    }

    return res.status(200).send({
      type: "RXERROR",
      message: "Something went wrong",
      // data: data
    })
    
  }

  async login(req, res) {

    let input = req.body;

    let result = validateParameters(["password", "email"], input);
    let ip_address = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    if (result != 'valid') {
      let error = formatJoiError(result.errors);
      return res.status(400).send({
        type: "RXERROR",
        message: "Invalid params",
        errors: error
      });
    }
    //  ip_address = "223.178.211.1"
    let ip_detail = await getIpDetail(ip_address)
    let country;
    if(typeof ip_detail === 'undefined' || ip_detail === null){
      country = null
    } else {
      country = ip_detail.country
    }

    let user = await User.findOne({
      where: {
        email: input.email
      }
    })

    if (user == null) {
      return res.status(400).send({
        type: "RXERROR",
        message: "No user found!"
      })
    }

    const validate = await bcrypt.compare(input.password, user.password);

    if (!validate) {
      return res.status(400).send({
        type: "RXERROR",
        message: "Invalid Password"
      })
    }

    let token = sha256(
      "YOUR_GPT" + user.id + "-" + Math.floor(Date.now() / 1000)
    );

    //create session 
    await UserSession.create({
      user_id: user.id,
      token: token,
      source: input.source,
      device_info: input.device_info,
      ip_address: ip_address,
      country:country,
      version: input.version,
      expires_at: moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss"),
      created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
    });


    let data = {
      "id": user.id,
      "name": input.name,
      "email": input.email,
      "username": user.username,
      "created_at": user.createdAt,
      "newAccount": false,
      "email_verified":  (user.email_verified == 1) ? true : false,
      "session_token":token
    };
   
    const jwtToken = await createJwtToken(data)

    data.token = jwtToken;

    return res.status(200).send({
      type: "RXSUCCESS",
      message: "Logged in successfully!",
      data: data
    })
  }

  async updateProfile(req, res) {

    // request input
    let validationInput = req.body;

    let name = validationInput.name;
    let username = validationInput.username;

    // convert into JSON
    let input = JSON.parse(JSON.stringify({ username: username, name: name }));

    // vaildate
    let result = updateProfileValidation.validate(input, { abortEarly: false });

    //if any error
    if (result.error) {
      let error = formatJoiError(result.error);
      return res.status(400).send({
        type: "RXERROR",
        message: error[Object.keys(error)[0]],
        error: error,
        input: input
      });
    }
    let user_id = req.authUser.User.id;

    // Check username if already taken
    if (typeof input.username != "undefined") {

      if ((input.username).length < 4) {
        return res.status(400).send({ type: "RXERROR", message: "Username must be at least 4 characters" });
      }

      let user = await User.findOne({ attributes: ["username"], where: { username: input.username, id: { [Sequelize.Op.not]: user_id } } });
      if (user != null) {
        return res.status(400).send({ type: "RXERROR", message: "username is not available." });
      }
    }

    // Update user
    await User.update(input, {
      where: { id: user_id }
    });

    return res.status(200).send({ "type": "RXSUCCESS", "message": "User detail updated successfully" });
  }

  async getDetail(req, res) {

    // get user_id from token
    let user = req.authUser.User;

    // set custom response
    let data = {
      "id": user.id,
      "name": user.name,
      "email": user.email,
      "username": user.username,
      "phone_no": user.phone_no,
      "firebase_uid": user.firebase_uid,
      "type": user.type,
      "country": user.country,
      "profile_pic": (user.profile_pic != null ? "https://assets.youropenai.app/profile/" + user.profile_pic : null),
      "created_at": user.createdAt,
    };

    // return 200
    return res.status(200).send({
      type: "RXSUCCESS",
      message: "Data Fetched Successfully!",
      data: data
    });
  }
  async checkAlreadyExists(input, res) {
    let users = await User.findAll({ where: input });
    // If username already exists
    if (count(users) > 0) {
      return res.status(400).send({
        type: "RXERROR",
        message: Object.keys(input)[0] + " already exists",
        error: {
          [Object.keys(input)[0]]: Object.keys(input)[0] + " already exists",
        },
      });
    }
  }

  async createUsername(email) {
    let username;
    let uniqueUsername = false;

    // Iterate
    do {
      if (email == null) {
        username = "openai-saas" + rand(1111, 9999) + rand(1111, 9999);
      } else {
        username = email.split("@")[0] + "" + rand(111, 999);
      }

      // Check the assigned username is unique
      if (count(await User.findAll({ where: { username: username } })) < 1) {
        uniqueUsername = true;
      }
    } while (!uniqueUsername);

    return username;
  }

  async subscribeMe(req,res){
    try {
        let input = req.body;
        if(typeof input.email=="undefined"){
          return res.status(400).json({ type:"RXERROR",message: "Email is required" });
        }
        let resultData=await Subscriber.create({email:input.email});
        return res.status(200).send({ type:"RXSUCCESS",message:'Subscription successful',resultData});
      } catch (error) {
        return res.status(400).json({ type:"RXERROR",message: error.message });
      }
  }
  
  async sendResetEmail(req, res) {
    let input = req.body;
    
    // validate params
    let result = validateParameters(["email"], input);

    if (result != "valid") {
      let error = formatJoiError(result.errors);
      return res.status(400).send({
        type: "RXERROR",
        message: "Invalid params",
        errors: error,
      });
    }

    // for url hash
    const str = "yourGPT"+ input.email + Math.floor(Date.now() / 1000) + Math.floor(Date.now() / 1000);
    const hash = sha256(str);
    const url = `https://app.yourgpt.ai/reset-password/${hash}`;

    const expired_at = moment().add(1, "day").format("YYYY-MM-DD HH:mm:ss");


    // finding user by mail exists or not
    let user = await User.findOne({
      where: {
        email: input.email
      },
    });

    // if user send mail
    if (user) {
      // create reusable transporter object using the default SMTP transport
      const maildata = config('mail')
      let transporter = nodemailer.createTransport(maildata);

      // send mail with defined transport object
      let htmlMessage = await loadEmailTemplate("resetPassword.ejs", {
        email: input.email,
        url: url,
        name : user.name
      });
      try {
        let info = await transporter.sendMail({
          from: "noreply@yourgpt.ai", // sender address
          to: user.email, // list of receivers
          subject: "Your reset password request", // Subject line
          html: htmlMessage, // plain text body
        });

        if (info.messageId) {
          const data = await ForgetPassword.create({
            user_id:user.id,
            email: input.email,
            hash:hash,
            expired_at:expired_at,
          });
          return res.status(200).json({
            type: "RXSUCCESS",
            message: `Check your email for a link to reset your password. If it doesn’t appear within a few minutes, check your spam folder.`
          });
        }
        return res
          .status(400)
          .send({ type: "RXERROR", message: "Something went wrong" });
      } catch (error) {
        console.log(error);
      }
    }
    if (!user) {
      return res
        .status(200)
        .send({ type: "RXSUCCESS", message: "user doesn't exists" });
    }
  }

  async resetPassword(req, res) {
    let input = req.body;

    let result = validateParameters(["hash","password"], input);

    if (result != "valid") {
      let error = formatJoiError(result.errors);
      return res.status(400).send({
        type: "RXERROR",
        message: "Invalid params",
        errors: error,
      });
    }

    const data = await ForgetPassword.findOne({
      where: {
        hash: input.hash,
        expired_at: { [Op.gte]: Sequelize.literal("NOW()") },
      },
    });

    if (data) {
      let hashedPass = await bcrypt.hash(input.password, 10);
      const user = await User.update(
        { password: hashedPass },
        { where: { id: data.user_id } }
      );
      return res.status(200).send({
        type: "RXSUCCESS",
        message: "Password change successfully",
      });
    }else {
      return res.status(200).send({
        type: "RXERROR",
        message: "No user found",
      });
    }
  }
  
  async changePassword(req,res) {
    const input = req.body
    let user_id = req.authUser.User.id;

    // validate the params
    let result = validateParameters(["current_password", "new_password"], input);

      if (result != "valid") {
        let error = formatJoiError(result.errors);
        return res.status(400).send({
          type: "RXERROR",
          message: "Invalid params",
          errors: error,
        });
      }
      let currrent_password = req.authUser.User.password;
      // comapre the input password and database password
      const value = await bcrypt.compare(input.current_password,currrent_password)

      // error if wrong currentPassword input 
      if (!value) {
        return res.status(200).send({
          type: "RXSUCCESS",
          message: "The previous password you entered is invalid."
        });
      }

    // generate new hash for new password
    const Salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(input.new_password,Salt)

    // update the new password
    const data = await User.update({password : hashPassword},{where : {id : user_id}})
    res.send({
        type: "RXSUCCESS",
        message: "Your password has been updated successfully."
    })
  }

  async verifyEmail(req,res) {
    const input = req.body;
    let result = validateParameters(["hash"], input);

      if (result != "valid") {
        let error = formatJoiError(result.errors);
        return res.status(400).send({
          type: "RXERROR",
          message: "Invalid params",
          errors: error,
        });
      }

      const emaildata = await EmailVerification.findOne({
        where: {
          hash: input.hash,
          expired_at: { [Op.gte]: Sequelize.literal("NOW()") },
        },
      });

      if (!emaildata) {
        return res.status(400).send({
          type: "RXERROR",
            message: "Invalid url"
        })
      }

      const data = await User.update({email_verified : "1"},{
        where : {email : emaildata.email}
      })
      // let user_data
      
      if (!data) {
        return res.status(400).send({
          type: "RXERROR",
            message: "User not found"
        })
      }
      // dd(emaildata.email,"@@@@@")
      let user_data = await User.findOne({
        where:{
          email : emaildata.email
        }
      })
     
      let contactData = {
        userid:user_data.id,
        firstname:user_data.name,
        country:user_data.country,
        email:user_data.email,
      }



      return res.status(200).send({
        type: "RXSUCCESS",
          message: "Email verified successfully"
      })
  }

  async resendEmailVerification(req,res){
    let input = req.body;
    let email = input.email;
    // validate the params
    let result = validateParameters(["email"], input);

    if (result != 'valid') {
        let error = formatJoiError(result.errors);
        return res.status(400).send({
          type: "RXERROR",
          message: "Invalid params",
          errors: error
        });
    }
    let current_date = Date.now();
    
    let user = await User.findOne({
      where:{
        email:email,
        email_verified:'0'
      }
    })
    if(!user){
      return res.status(400).send({type:"RXERROR",message:"Invalid user"})
    }

    let email_verification_data = await EmailVerification.findOne({
      where:{
        email:email     
      }
    })
    if(!email_verification_data){
      const str = "yourGPT"+ input.email + Math.floor(Date.now() / 1000) + Math.floor(Date.now() / 1000);
      const hash = sha256(str);
      const expired_at = moment().add(1, "day").format("YYYY-MM-DD HH:mm:ss");
      email_verification_data=await EmailVerification.create({email : input.email , hash : hash , expired_at : expired_at})
    }

    await EmailVerification.update({ expired_at: Sequelize.literal(`expired_at + interval 3600 SECOND`)},{
      where:{
        id:email_verification_data.id     
      }
    })
      
    const maildata = config('mail')
    // console.log(maildata);
    let transporter = nodemailer.createTransport(maildata);
    // const hash = sha256(str);
    const hash = email_verification_data.hash
    // dd(hash,"*************")
    const url = `https://app.yourgpt.ai/verify-email/${hash}`;
    
    // send mail with defined transport object
    let htmlMessage = await loadEmailTemplate("verifyEmail.ejs", {
      email: email,
      url : url
    });

    let info = await transporter.sendMail({
      from:"noreply@yourgpt.ai", // sender address
      to: email, // list of receivers
      subject: "Resend verification link", // Subject line
      html: htmlMessage, // plain text body
    });

    return res.status(200).send({type:"RXSUCCESS",message:"Email resend successfully"})
    
  }

  async validateEmail(email) {
    // Regular expression pattern for email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }
};


const updateProfileValidation = Joi.object().keys({
  name: Joi.string().max(100, "utf8"),
  username: Joi.string()
    .regex(/^[a-zA-Z0-9_.]*$/)
    .min(5, "utf8")
    .max(100, "utf8")
    .messages({
      "object.regex": "Username should be alpha numberic",
      "string.pattern.base": "Username should be alpha numberic",
    }),
});