let { Op } = require("sequelize");
let { User, UserSession } = require("../app/Models");
let Sequelize = require("sequelize");
let Joi = require("@hapi/joi");
const jwt = require('jsonwebtoken')
// Format joi validator error
const formatJoiError = (errors) => {
  let joiErrors = errors.details;
  let formatError = {};
  joiErrors.forEach((data) => {
    formatError[data.path[0]] = data.message.replace(/"/g, "");
  });
  console.log("log", formatError);
  // console.log(formatError + "This is for matted error");
  return formatError;
};

const ucfirst = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const rand = (max, min) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const array_rand = (items) => {
  return items[Math.floor(Math.random() * items.length)];
};

const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

const isset = (string, value = "") => {
  return typeof string != "undefined" ? string : value;
};

const strpos = (string, value = "") => {
  return string.indexOf(value) != -1 ? string.indexOf(value) : false;
};

const substr = (string, start, end) => {
  return string.substr(start, end);
};

const strlen = (string) => {
  return string != null ? string.length : 0;
};

const in_array = (array, value) => {
  return array.indexOf(value);
};

const count = (array) => {
  return array.length;
};

// getAuthUser details using token
const authUser = async (req) => {
  //console.log(req,typeof req.token != "undefined");

  // let token
  let token;
  if (typeof req == "string") {
    token = req;
  } else if (typeof req == "object" && typeof req.token != "undefined") {
    token = req.token;
  } else {
    // If authorisation is undefined return null
    if (
      typeof req.headers.authorization == "undefined" ||
      req.headers.authorization == ""
    ) {
      return null;
    }
    // set token headers authorizations
    token = req.headers.authorization;
  }
  // replace if token is coming with bearer
  token = token.replace("Bearer ", "");

  const {jwt_key} = config('jwt')
  try {
    decoder = await jwt.verify(token,jwt_key)
    console.log(decoder);
    if (!decoder.data.session_token) {
      console.log("!decoder.session_token");
      return null
    }
  } catch (error) {
    console.log("error");
    return null
  }

  // search for attributes
  let user = await UserSession.findOne({
    where: {
      token: decoder.data.session_token,
      expires_at: {
        [Op.gte]: Sequelize.literal("NOW()"),
      },
    },
    include: [
      {
        model: User,
        attributes: { exclude: ['password'] },
      },
    ],
  });
  // return user
  return user;
};


/**
 * Generates a Joi validator using the array provided and also allows extra params but makes the specified parameters compulsory
 *
 * @param {array} requiredParams array of strings specifiying the required parameters for validator, creates automatic messages using the name as well
 * @returns returns Joi validator object
 */
const generateValidator = (requiredParams) => {
  let obj = {};

  requiredParams.forEach((element) => {
    obj[element] = Joi.string()
      .required()
      .messages({
        "any.required": `${element} cannot be blank`,
        "string.empty": `${element} cannot be blank`,
      });
  });

  return Joi.object().keys(obj).unknown();
};

/**
 *
 * @param {array} requiredParams array of strings specifyinh the required parametrs for validator, creates automatic messages using the name as well
 * @param {req.body} input the input data to validate
 * @returns {string} valid when the parameters are valid
 * @returns {Object} errors when there are errors present, can be directly returned to res.send
 *
 */
const validateParameters = (requiredParams, input) => {
  let validator = generateValidator(requiredParams);

  let result = validator.validate(input, { abortEarly: false });

  // In case of missing parameters, thro
  if (result.error) {
    let error = result.error;
    return {
      message: "Invalid params",
      errors: error,
    };
  }

  return "valid";
};

const createJwtToken = async (data) => {
  const { jwt_key } = config('jwt')

  const jwtToken = jwt.sign({data : data},jwt_key)

  return jwtToken
}
module.exports = {
  formatJoiError,
  ucfirst,
  isset,
  strlen,
  strpos,
  count,
  rand,
  array_rand,
  shuffle,
  substr,
  in_array,
  authUser,
  validateParameters,
  createJwtToken
};
