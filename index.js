// index.js
require("./bin/kernel");
let express = require("express");
let path = require("path");
let logger = require("morgan");
let apiRoutes = require("./routes/api");
// Import the library:
let cors = require("cors");
let app = express();
// view engine setup

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Then use it before your routes are set up:

app.use(cors());
app.use("/api/v1/", apiRoutes);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next({
    status: 404,
    message: "Not Found"
  });
});

// error handler
app.use((err, req, res, next) => {
  if (err.status === 404) {
    return res.status(400).render("errors/404");
  }

  if (err.status === 500) {
    return res.status(500).render("errors/500");
  }
  next();
});

module.exports = app;