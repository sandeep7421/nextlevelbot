const { User, UserSession } = require("../../../Models");
const bcrypt = require('bcryptjs');
let sha256 = require("sha256");
let moment = require("moment");

let { formatJoiError, validateParameters, createJwtToken } = require(baseDir() + "helper/helper");

let Sequelize = require("sequelize");
const { Op } = require("sequelize")

module.exports = class UserController {
  
  async register(req, res) {

    let inputData = req.body;
    let result = validateParameters(["name", "email", "phone", "password"], inputData);
    if (result != 'valid') {
      let error = formatJoiError(result.errors);
      return res.status(400).send({
        type: "ERROR",
        message: "Invalid params",
        errors: error
      });
    }

    let email = inputData.email;
    const isValidEmail = await this.validateEmail(email);
  
    if(isValidEmail===false){
      return res.status(400).send({type:"ERROR",message:"Please add a valid email"})
    }

    // check if email already exists

    let emailCheck = await User.findOne({
      where: {
        email: email
      }
    });

    if (emailCheck) {
      return res.status(400).send({
        type: "ERROR",
        message: "Email already exists"
      })
    }

    let hashedPass = await bcrypt.hash(inputData.password, 10);
    inputData.password = hashedPass;
  
    try {
        
      // create user
      let userData = await User.create(inputData);

      let token = sha256(
        "NEXTLEVELBOT" + userData.id + "-" + Math.floor(Date.now() / 1000)
      );

      //create session 
      await UserSession.create({
        user_id: userData.id,
        token: token,
        expires_at: moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss"),
        created_at: moment().format("YYYY-MM-DD HH:mm:ss")
      });

      let jwtTokenData = {
              "session_token":token
      };

      const jwtToken = await createJwtToken(jwtTokenData)
      const data = { ...userData.toJSON(), "token": jwtToken };
      delete data.password

      return res.status(200).send({
        type: "SUCCESS",
        message: "Registered Successfully",
        data: data
      })
    }
    catch (error) {
      console.log(error);
    }

    return res.status(200).send({
      type: "ERROR",
      message: "Something went wrong"
    })
  }

  async login(req, res) {

    let inputData = req.body;

    let result = validateParameters(["email", "password"], inputData);

    if (result != 'valid') {
      let error = formatJoiError(result.errors);
      return res.status(400).send({
        type: "ERROR",
        message: "Invalid params",
        errors: error
      });
    }
  

    let user = await User.findOne({
      where: {
        email: inputData.email
      }
    })

    if (user == null) {
      return res.status(400).send({
        type: "ERROR",
        message: "No user found!"
      })
    }

    const validate = await bcrypt.compare(inputData.password, user.password);

    if (!validate) {
      return res.status(400).send({
        type: "ERROR",
        message: "Invalid Password"
      })
    }

    let token = sha256(
      "NEXTLEVELBOT" + user.id + "-" + Math.floor(Date.now() / 1000)
    );

    //create session 
    await UserSession.create({
      user_id: user.id,
      token: token,
      expires_at: moment().add(1, "year").format("YYYY-MM-DD HH:mm:ss"),
      created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
    });

    let jwtTokenData = {
      "session_token":token
    };

    const jwtToken = await createJwtToken(jwtTokenData)
    
    let is_email_verified = (user.email_verified_at == null) ? false : true;
    const data = { ...user.toJSON(), "token": jwtToken, "is_email_verified": is_email_verified };


    return res.status(200).send({
      type: "SUCCESS",
      message: "Logged in successfully!",
      data: data
    })
  }

  async me(req, res) {
    
    // get user_id from token
    let user = req.authUser;

    let data = user.toJSON()
    // return 200
    return res.status(200).send({
      type: "SUCCESS",
      message: "Data Fetched Successfully!",
      data: data
    });
  }

  async validateEmail(email) {
    // Regular expression pattern for email validation
    const strongEmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return strongEmailPattern.test(email);
  }

};