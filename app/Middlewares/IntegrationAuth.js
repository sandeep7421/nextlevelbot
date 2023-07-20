let { Integration } = require("../Models");
module.exports = async (req, res, next) => {
    var input = req.body;
    // dd(req)
    let req_path = req.path
    let checkStr = req_path.substring(1);
    let newStr = checkStr.split("/")[0]; // "discord"
    let integration_id;
    let public_key;
    let secret_key;
    if (typeof req == "object" && typeof input.public_key != 'undefined' && typeof input.secret_key != 'undefined') {
        public_key = input.public_key;
        secret_key = input.secret_key;
    }
    else if (typeof req == "object" && typeof req.query.public_key != 'undefined' && typeof req.query.secret_key != 'undefined') {
        public_key = req.query.public_key;
        secret_key = req.query.secret_key
    }
    else if (typeof req == "object" && typeof req.headers.public_key != 'undefined' && typeof req.headers.secret_key != 'undefined') {
        public_key = req.headers.public_key;
        secret_key = req.headers.secret_key
    }
    else {
        return res.status(400).send({ type: "RXERROR", message: "public_key or secret_key has invalid undefined value" });
    }

    switch(newStr){
        case 'discord':
            integration_id='1'
            break;
        case 'slack':
            integration_id='2'
            break;
        case 'chatbot':
            integration_id='3'
            break;
        case 'zapier':
            integration_id='4'
            break;
        case 'telegram':
            integration_id='7'
            break;
    }
    let data = await Integration.findOne({
        where: {
            public_key: public_key,
            secret_key: secret_key,
            id:integration_id
        },
    });
    if (data == null) {
        return res.status(400).send({ type: "RXERROR", message: "un-Authorised public_key or secret_key", code: 401 });
    }
    req.integration=data;
    next();
}