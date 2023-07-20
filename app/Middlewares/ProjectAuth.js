let { Project, ProjectKey, whitelistedDomain } = require("../Models");
module.exports = async (req, res, next) => {
  var input = req.body;

  let data;

  let project = await Project.findOne({
    where: {
      project_uid: input.project_uid,
    },
  });

  if (project == null) {
    return res.status(400).send({
      type: "RXERROR",
      message: "un-Authorised project_uid",
      code: 401,
    });
  }

  if (typeof req == "object" && typeof input.project_uid != "undefined" && typeof input.public_key != "undefined" && typeof input.whitelisted_domain != "undefined" ) {
    let project_keys = await ProjectKey.findOne({
      where: {
        project_id: project.id,
        public_key: input.public_key,
      },
    });

    let project_domains = await whitelistedDomain.findOne({
      where: {
        project_id: project.id,
        domain: input.whitelisted_domain,
      },
    });

    if (project_keys == null || project_domains == null) {
      return res.status(400).send({ type: "RXERROR", message: "un-Authorised public_key or secret_key", code: 401 });
    }
  } else if (typeof req == "object" && typeof input.public_key != "undefined" && typeof input.secret_key != "undefined") {

    let project_keys = await ProjectKey.findOne({
      where: {
        public_key: input.public_key,
        secret_key: input.secret_key,
        project_id: project.id,
      },
    });

    if (project_keys == null) {
      return res.status(400).send({ type: "RXERROR", message: "un-Authorised public_key or secret_key", code: 401 });
    }
    
  } else {
    return res.status(400).send({type: "RXERROR", message: "project_id or public_key cannot be empty"});
  }

  if (data == null) {
    return res.status(400).send({ type: "RXERROR", message: "un-Authorised project_uid or api_key", code: 401 });
  }
  // req.project=data;
  next();
};
