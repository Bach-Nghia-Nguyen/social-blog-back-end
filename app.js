const express = require("express");
require("dotenv").config();
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
const mongoURI = process.env.MONGODB_URI;
const utilsHelper = require("./helpers/utils.helper");

const indexRouter = require("./routes/index");

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

/* DB Connections */
mongoose
  .connect(mongoURI, {
    // some options to deal with deprecated warning
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`Mongoose connected to ${mongoURI}`);
    // require("./testing/testSchema");
  })
  .catch((error) => console.log(error));

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error("Not Found");
  error.statusCode = 404;
  next(error);
});

/* Initialize Error Handling */
app.use((error, req, res, next) => {
  console.log("ERROR", error);
  if (error.isOperational) {
    return utilsHelper.sendResponse(
      res,
      error.statusCode ? error.statusCode : 500,
      false,
      null,
      { message: error.message },
      error.errorType
    );
  } else {
    return utilsHelper.sendResponse(
      res,
      error.statusCode ? error.statusCode : 500,
      false,
      null,
      { message: error.message },
      "Internal Server Error"
    );
  }
});

module.exports = app;
