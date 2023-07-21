const { User } = require("../../../Models");

let { formatJoiError, validateParameters } = require(baseDir() + "helper/helper");

let Sequelize = require("sequelize");
const { Op } = require("sequelize")

module.exports = class UserController {
  
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

};