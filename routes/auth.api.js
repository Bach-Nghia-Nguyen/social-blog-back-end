const express = require("express");
const router = express.Router();

const validators = require("../middlewares/validators");
const { body } = require("express-validator");
const authController = require("../controllers/auth.controller");
const passport = require("passport");

/**
 * @route POST api/auth/login
 * @description Login
 * @access Public
 */
router.post(
  "/login",
  validators.validate([
    body("email", "Invalid email").exists().isEmail(),
    body("password", "Invalid password").exists().notEmpty(),
  ]),
  authController.loginWithEmail
);

/**
 * @route POST api/auth/login/facebook
 * @description Login with Facebook
 * @access Public
 */
router.post(
  "/login/facebook",
  passport.authenticate("facebook-token"),
  authController.loginWithFacebookOrGoogle
);

/**
 * @route POST api/auth/login/google
 * @description Login with Google
 * @access Public
 */

module.exports = router;
