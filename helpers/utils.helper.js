"use strict";
const crypto = require("crypto");

const utilsHelper = {};

/**
 * This function controls the way we respond to the client
 * If we need to change the way to respond later on, we only need to handle it here
 */
utilsHelper.sendResponse = (res, status, success, data, errors, message) => {
  const response = {};
  if (success) response.success = success;
  if (data) response.data = data;
  if (errors) response.errors = errors;
  if (message) response.message = message;
  return res.status(200).json(response);
};

utilsHelper.catchAsync = (func) => (req, res, next) => {
  func(req, res, next).catch((err) => next(err));
};

class AppError extends Error {
  constructor(statusCode, message, errorType) {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    // all errors using this class are operational errors
    this.isOperational = true;
    // create a stack trace for debugging (Error obj, void obj to avoid stack polution)
    Error.captureStackTrace(this, this.constructor);
  }
}

utilsHelper.generateRandomHexString = (len) => {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString("hex")
    .slice(0, len)
    .toUpperCase();
};

// utilsHelper.generateRandomHexString = (len) => {
//   return cryptoRandomString({ length: len, type: "alphanumeric" });
// };

utilsHelper.filterFields = (obj, allows) => {
  const result = {};
  for (const field of allows) {
    result[field] = field in obj ? obj[field] : "";
  }
  return result;
};

utilsHelper.AppError = AppError;
module.exports = utilsHelper;
