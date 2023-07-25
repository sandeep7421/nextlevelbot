let express = require("express");
let router = express.Router();
let Auth = middleware('Auth');

let user = controller("Api/User/UserController");

router.post("/register", [], (req, res) => {
  return user.register(req, res); 
});

router.post("/login", [], (req, res) => {
  return user.login(req, res);
});

router.get("/me", [Auth], (req, res) => {
  return user.me(req, res);
});

module.exports = router;