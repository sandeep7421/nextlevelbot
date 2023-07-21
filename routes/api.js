let express = require("express");
let router = express.Router();
let Auth = middleware('Auth');

let user = controller("Api/User/UserController");

router.post("/register", [], (req, res) => {
  return user.register(req, res);
});

module.exports = router;