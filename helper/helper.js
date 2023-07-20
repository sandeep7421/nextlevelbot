let { Op } = require("sequelize");
let { User, UserSession, OrganizationMember, Organization, ProjectMember, Project, IpAddress,ProjectUsage,sequelize,UsageLimit,UsageData } = require("../app/Models");
let Sequelize = require("sequelize");
const QueryTypes = Sequelize.QueryTypes;
let moment = require("moment");
let fetch = require("node-fetch");
let Joi = require("@hapi/joi");
const ejs = require('ejs');
const { exist } = require("@hapi/joi");
const crypto = require("crypto");
const algorithm = "aes-256-cbc";
const crypto_data = config('crypto')
let AES_ENCRYPTION_KEY = crypto_data.enc_key
let AES_ENCRYPTION_IV = crypto_data.iv
const jwt = require('jsonwebtoken')
let count_data = config('plan');
let AWS = require('aws-sdk');

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
      console.log("!decoder.session_uid");
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
      },
    ],
  });
  // return user
  return user;
};

const createJwtToken = async (data) => {
  const { jwt_key } = config('jwt')

  const jwtToken = jwt.sign({data : data},jwt_key)

  return jwtToken
}

const loadEmailTemplate = async (path, data) => {
  return await new Promise((resolve, reject) => {
    ejs.renderFile(baseDir() + "resources/views/mails/" + path, data, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

const validateGoogleRecaptchaToken = async (token) => {
  const secret_key = config("app").google_recaptcha_secret_key;
  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${token}`;

  let captcha = await new Promise(async (resolve, reject) => {
    fetch(url, {
      method: "post",
    })
      .then((response) => response.json())
      .then((google_response) => resolve(google_response))
      .catch((error) => reject(error));
  });

  if (typeof captcha.success != "undefined" && captcha.success) {
    return true;
  } else {
    return false;
  }
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


/**
 * Update coin functionality
 *
 * @param {*} userId
 * @param {*} coins
 * @param {*} action
 * @param {*} updateType
 */
const updateCoinsAndLedger = async (
  userId,
  coins,
  action,
  description = "",
  updateType = "add"
) => {
  let userCreditData = await UserCredit.findOne({
    where: {
      user_id: userId,
    },
  });

  if (updateType != "add" && userCreditData.coins < coins) {
    return { type: "RXERROR", message: "You don't have enough coins" };
  }

  await Ledger.create({
    user_id: userId,
    old: userCreditData.coins,
    new:
      updateType == "add"
        ? parseInt(userCreditData.coins) + parseInt(coins)
        : parseInt(userCreditData.coins) - parseInt(coins),
    type: "coins",
    action: action,
    amount: (updateType == "add" ? "" : "-") + coins,
    description: description,
  });

  await UserCredit.update(
    {
      coins:
        updateType == "add"
          ? Sequelize.literal("coins + " + coins)
          : Sequelize.literal("coins - " + coins),
    },
    { where: { user_id: userId } }
  );

  return { type: "RXSUCCESS", message: "success" };
};

/**
 * 
 * @param {*} type 
 * @param {*} searchParam
 * @param {*} allowedRole
 * @param {*} key
 * @returns user valid or not
 */
const userPrivilege = async ({ type, searchParam, allowedRole = ["owner"], key }) => {

  if (type == "organization") {
    const data = await OrganizationMember.findAll({
      include: [
        {
          model: Organization,
          attributes: ["openai_key"],
          as: 'Organization'
        }
      ],
      where: searchParam
    })
    // console.log(data);

    if (data.length == 0) {
      return { type: "RXERROR", message: "Data not found" }
    }

    const result = allowedRole.find((allowedRole) => {
      return allowedRole == data[0].role

    })

    if (!result) {
      return { type: "RXERROR", message: "Insufficient rights or privileges" }
    } else {
      return 'valid'
    }
  }
  if (type == "project") {

    // Getting project member data through searchParams 
    const data = await ProjectMember.findAll({
      include: [
        {
          model: Project,
          attributes: ["project_uid"],
          as: 'Project'
        }
      ],
      where: searchParam
    })
    // dd(data[0],"++++++++")

    // if not a member of that project_uid
    if (data.length == 0) {
      return { type: "RXERROR", message: "Data not found" }
    }

    // validate the project_id  is related to that project_member's Project_key or not which you want to update
    const data1 = data.filter((data) => { return data.Project.project_uid == key })
    //  console.log("dhasgdhs",data1);

    // error if key is not match
    if (data1.length == 0) {
      return { type: "RXERROR", message: "Incorrect project key" }
    }

    // checking user have sufficient rights or not
    const result = allowedRole.find((allowedRole) => {
      return allowedRole == data1[0].role

    })
    console.log(result);

    // through error if user have not sufficient rights
    if (!result) {
      return { type: "RXERROR", message: "Insufficient rights or privileges" }
    } else {
      return "valid"
    }
  }
  // if time not match to organization and project
  return { type: "RXERROR", message: "Incorrect type" }
}

const getIpDetail = async (ip) => {
  try {
    let ipData = await IpAddress.findOne({
      where: {
        ip: ip,
        updated_at: {
          [Op.gte]: Sequelize.literal("NOW() - INTERVAL 2 DAY"),
        },
      },
    });
    let appConfigs = config("app");
    if (ipData) {
      return ipData.dataValues;
    } else {
      try {
        ipDetail = await fetch(
          "https://ipinfo.io/" + ip + "/json?token=" + appConfigs.ip_token1).then((res) => res.json());

        let ipDataRes = await IpAddress.findOne({ where: { ip: ip } });

        ipData = {
          ip: ipDetail.ip,
          city: ipDetail.city,
          region: ipDetail.region,
          country: ipDetail.country,
          loc: ipDetail.loc,
          org: ipDetail.org,
          postal: ipDetail.postal,
          timezone: ipDetail.timezone,
        };
        if (ipDataRes) {
          await IpAddress.update(ipData, { where: { ip: ip } });
          return ipData;
        } else {
          await IpAddress.create(ipData);
          return ipDetail;
        }

      } catch (err) {
        return
      }
    }
  } catch (err) {
    try {
      let ipData = await IpAddress.findOne({
        where: {
          ip: ip,
          updated_at: {
            [Op.gte]: Sequelize.literal("NOW() - INTERVAL 2 DAY"),
          },
        },
      });
      let appConfigs = config("app");
      if (ipData) {
        return ipData.dataValues;
      } else {
        // ipDetail = await fetch("https://ipinfo.io/" + ip + "/json?token=").then((res) => res.json());
        try {
          ipDetail = await fetch(
            "https://ipinfo.io/" + ip + "/json?token=" + appConfigs.ip_token2).then((res) => res.json());
          let ipData = await IpAddress.findOne({ where: { ip, ip } });
          if (ipData) {
            await IpAddress.update(
              {
                ip: ipDetail.ip,
                city: ipDetail.city,
                region: ipDetail.region,
                country: ipDetail.country,
                loc: ipDetail.loc,
                org: ipDetail.org,
                postal: ipDetail.postal,
                timezone: ipDetail.timezone,
              },
              { where: { ip: ip } }
            );
          } else {
            await IpAddress.create({
              ip: ipDetail.ip,
              city: ipDetail.city,
              region: ipDetail.region,
              country: ipDetail.country,
              loc: ipDetail.loc,
              org: ipDetail.org,
              postal: ipDetail.postal,
              timezone: ipDetail.timezone,
            });
          }
        } catch (err) {
          return
        }
      }
    } catch (e) {
      ipDetail = null;
    }
  }

};


const encrypt = (async (openai_key) => {
  try {
    let cipher = crypto.createCipheriv('aes-256-cbc', AES_ENCRYPTION_KEY, AES_ENCRYPTION_IV);
    let encrypted = cipher.update(openai_key, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  } catch (e) {
    return '';
  }
});

const decrypt = (async (api_key) => {
  try {
    let decipher = crypto.createDecipheriv('aes-256-cbc', AES_ENCRYPTION_KEY, AES_ENCRYPTION_IV);
    let decrypted = decipher.update(api_key, 'base64', 'utf8');
    return (decrypted + decipher.final('utf8'));
  } catch (e) {
    return ''
  }

});
// replace by getProjectData
const getProject = (async (res, project_uid) => {
  let project_data = await Project.findOne({
    where: {
      project_uid: project_uid
    }
  })
  if (!project_data) {
    return res.status(400).send({ type: "RXERROR", message: "Please provide a valid Project Uid" })
  }
  return project_data;
});

const getProjectData = (async (project_uid) => {
  let project_data = await Project.findOne({
    where: {
      project_uid: project_uid
    }
  })
  if (!project_data) {
    return null
  }
  return project_data;
});

const checkQueryCount = (async (res,project_id) => {
  let app_id =1;
  count_data = count_data.app_id[app_id];

  let project_usage = await ProjectUsage.findOne({
    where: {
      project_id: project_id
    }
  })

    if(!project_usage){
      await ProjectUsage.create({
          project_id:project_id,
          query_count:0
      })
    }
   
  if (project_usage) {
    let plan = project_usage.plan
    let query_count;
    let next_cycle_time = new Date(project_usage.next_cycle).getTime();
    let current_date = Date.now();
    let error_message;


    switch (plan) {
      case 'basic':

        query_count = count_data.basic.query_limit
        if (project_usage.query_count >= query_count) {
          error_message = "Your basic plan usage limit exceeded. Please choose a new plan on https://yourgpt.ai/pricing."
        }
        break;
      case 'starter_monthly':

        query_count = count_data.starter_monthly.query_limit
        if (project_usage.query_count >= query_count){
          error_message = "Your starter plan usage limit exceeded. Please upgrade plan on https://yourgpt.ai/pricing."
        } else if(next_cycle_time < current_date) {
          error_message = "Your starter plan has expired. Please renew it on https://yourgpt.ai/pricing."
        }
        break;
      case 'growth_monthly':

        query_count = count_data.growth_monthly.query_limit
        if (project_usage.query_count >= query_count){
          error_message = "Your growth plan usage limit exceeded. Please upgrade plan on https://yourgpt.ai/pricing."
        } else if(next_cycle_time < current_date) {
          error_message = "Your growth plan has expired. Please renew it on https://yourgpt.ai/pricing."
        }
        break;
      case 'professional_monthly':
      query_count = count_data.professional_monthly.query_limit
      if (project_usage.query_count >= query_count){
        error_message = "Your professional plan usage limit exceeded. Please upgrade plan on https://yourgpt.ai/pricing."

      } else if(next_cycle_time < current_date) {
        error_message = "Your professional plan has expired. Please renew it on https://yourgpt.ai/pricing."
      }
      break;

      case 'elite_monthly':
        query_count = count_data.elite_monthly.query_limit
        if (project_usage.query_count >= query_count){
          error_message = "Your elite plan usage limit exceeded. Please upgrade plan on https://yourgpt.ai/pricing."
  
        } else if(next_cycle_time < current_date) {
          error_message = "Your elite plan has expired. Please renew it on https://yourgpt.ai/pricing."
        }
        break;
    }
    return error_message
  
  }
});

const checkDocumentCount = (async (res,project_id,url_length) => {
  let app_id =1;
  count_data = count_data.app_id[app_id];
  let project_usage = await ProjectUsage.findOne({
    where: {
      project_id: project_id
    }
  })

  if(!project_usage){
    await ProjectUsage.create({
        project_id:project_id,
        document_count:0
    })
  }

  if (project_usage) {
    let plan = project_usage.plan
    let document_count;
    let next_cycle_time = new Date(project_usage.next_cycle).getTime();
    let current_date = Date.now();
    let error_message;


    switch (plan) {
      case 'basic':
        document_count = count_data.basic.document_limit
        if (project_usage.document_count >= document_count) {
          error_message = "Your basic plan document upload limit exceeded. Please choose a new plan on https://yourgpt.ai/pricing."
        }else if(document_count < url_length){
          error_message = "Your basic plan permits up to "+document_count+" documents."
        }
        break;

      case 'starter_monthly':

        document_count = count_data.starter_monthly.document_limit
        if (project_usage.document_count >= document_count){
          error_message = "Your starter plan document upload limit exceeded. Please upgrade plan on https://yourgpt.ai/pricing."
        } else if (next_cycle_time < current_date) {
          error_message = "Your starter plan has expired. Please renew it on https://yourgpt.ai/pricing."
        } else if (document_count>=url_length){
          error_message = "Your starter plan permits up to "+document_count+" documents."
        }
        break;

      case 'growth_monthly':

        document_count = count_data.growth_monthly.document_limit
        if (project_usage.document_count >= document_count){
          error_message = "Your growth plan document upload limit exceeded. Please upgrade plan on https://yourgpt.ai/pricing."
        } else if (next_cycle_time < current_date) {
          error_message = "Your growth plan has expired. Please renew it on https://yourgpt.ai/pricing."
        } else if (project_usage.document_count >= document_count){
          error_message = "Your growth plan permits up to "+document_count+" documents."
        }
        break;

      case 'professional_monthly':

      document_count = count_data.professional_monthly.document_limit
      if (project_usage.document_count >= document_count){
        error_message = "Your professional plan document upload limit exceeded. Please upgrade plan on https://yourgpt.ai/pricing."
      } else if (next_cycle_time < current_date) {
        error_message = "Your professional plan has expired. Please renew it on https://yourgpt.ai/pricing."
      } else if (project_usage.document_count >= document_count){
        error_message = "Your professional plan permits up to "+document_count+" documents."
      }
      break;

      case 'elite_monthly':

      document_count = count_data.elite_monthly.document_limit
      if (project_usage.document_count >= document_count){
        error_message = "Your elite plan document upload limit exceeded. Please upgrade plan on https://yourgpt.ai/pricing."
      } else if (next_cycle_time < current_date) {
        error_message = "Your elite plan has expired. Please renew it on https://yourgpt.ai/pricing."
      } else if (project_usage.document_count >= document_count){
        error_message = "Your elite plan permits up to "+document_count+" documents."
      }
      break;
    }

    return error_message
  
  }
});

const checkOrganizationLimit = async (data) => {
  const {organization_id , usage_type , project_id , app_id} = data
  const result = await UsageLimit.findOne({
    where : {
      organization_id : organization_id,
      limit_type : usage_type,
      project_id : project_id,
      app_id : app_id
    }
  })

  if (!result) {
    return {
      message : "no plan found"
    }
  }
  let checkOrganizationLimit
  if (data.project_id) {
      checkOrganizationLimit = await sequelize.query(`SELECT  u.plan_id, u.usage_type, SUM(u.usage_value) AS total_usage, ul.limit_value ,SUM(ul.limit_value) - SUM(u.usage_value) AS limit_left FROM usage_data u JOIN
      usage_limits ul ON u.plan_id = ul.plan_id
          AND u.app_id = ul.app_id
          AND u.usage_type = ul.limit_type
          AND u.organization_id = ul.organization_id
      WHERE
        u.usage_type = :usage_type
        AND u.organization_id = :organization_id
        AND u.app_id = :app_id
        AND u.project_id = :project_id
      GROUP BY u.plan_id , u.usage_type , ul.limit_value HAVING SUM(u.usage_value) < ul.limit_value;`,{
    replacements:data,
    type: QueryTypes.SELECT
    })

    return {
      data : checkOrganizationLimit
    }
  }
    checkOrganizationLimit = await sequelize.query(`SELECT  u.plan_id, u.usage_type, SUM(u.usage_value) AS total_usage, ul.limit_value,SUM(ul.limit_value) - SUM(u.usage_value) AS limit_left FROM usage_data u JOIN
    usage_limits ul ON u.plan_id = ul.plan_id
        AND u.app_id = ul.app_id
        AND u.usage_type = ul.limit_type
        AND u.organization_id = ul.organization_id
    WHERE
        u.usage_type = :usage_type
        AND u.organization_id = :organization_id
        AND u.app_id = :app_id
    GROUP BY u.plan_id , u.usage_type , ul.limit_value HAVING SUM(u.usage_value) < ul.limit_value;`,{
  replacements:data,
  type: QueryTypes.SELECT
  })

  return {
    data : checkOrganizationLimit
  }
}

const increaseLimit= async (by,data) => {
  await UsageData.increment('usage_value', { by: by, where: data});
}


const addToIndexQueue = (async (type,data) => {
  AWS.config.update({
    accessKeyId: config("aws").accessKeyId, // Access key ID
    secretAccessKey: config("aws").secretAccessKey, // Secret access key
    region: "us-east-1" //Region
  });

  // Create an SQS service object
  var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
  
  var params = {
    // Remove DelaySeconds parameter and value for FIFO queues
    DelaySeconds: 0,
    MessageBody: JSON.stringify({
      type:type, // files,webpages
      data:data
    }),
    MessageDeduplicationId: Date.now().toString(),  // Required for FIFO queues
    MessageGroupId: type,  // Required for FIFO queues
    QueueUrl: "https://sqs.us-east-1.amazonaws.com/948582588497/GPTIndexingQueue.fifo"
  };

  return new Promise((resolve,reject)=>{
    sqs.sendMessage(params, function(err, data) {
      if (err) {
        console.log("Error", err);
        resolve(false)
      }else{
        console.log("Success", data.MessageId);
        resolve(data.MessageId)
      }
    });
  })

});

const notifyOnDiscord = async (data) => {
  const { url } = config('discord')
  try {
    const result = await fetch(url,{
      method : "POST",
      headers : {
        'Content-Type': 'application/json'
      },
      body : JSON.stringify({
        "content": data
      })
    })

    const response = await result.text();
    console.log(response);
  } catch (error) {
    console.log("error",error);
  }
}

module.exports = {
  formatJoiError,
  ucfirst,
  getProject,
  getProjectData,
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
  validateGoogleRecaptchaToken,
  updateCoinsAndLedger,
  validateParameters,
  getIpDetail,
  loadEmailTemplate,
  userPrivilege,
  encrypt,
  decrypt,
  checkQueryCount,
  checkDocumentCount,
  createJwtToken,
  addToIndexQueue,
  checkOrganizationLimit,
  increaseLimit,
  notifyOnDiscord
};
