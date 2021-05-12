const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const Schema = mongoose.Schema;

const userSchema = Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatarUrl: { type: String, required: false, default: "" },
    password: { type: String, required: true, select: false },
    emailVerificationCode: { type: String, select: false },
    emailVerified: { type: Boolean, required: true, default: false },
    friendCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

userSchema.plugin(require("./plugins/isDeletedFalse"));

userSchema.methods.toJSON = function () {
  const object = this._doc;

  delete object.password;
  delete object.emailVerified;
  delete object.emailVerificationCode;
  delete object.isDeleted;

  return object;
};

userSchema.statics.findOrCreate = function (profile, callback) {
  const userObj = new this();

  this.findOne({ email: profile.email }, async function (err, result) {
    if (!result) {
      // create user
      // 1. make new password
      const newPassword = "" + Math.floor(Math.random() * 100_000_000);
      const salt = await bcrypt.genSalt(10);
      newPassword = await bcrypt.hash(newPassword, salt);

      // 2. save user
      userObj.name = profile.name;
      userObj.email = profile.email;
      userObj.password = newPassword;
      userObj.avatarUrl = profile.avatarUrl;

      // 3. call the callback
      await userObj.save(callback);
    } else {
      // send that user information back to passport
      callback(err, result);
    }
  });
};

userSchema.methods.generateToken = async function () {
  const accessToken = await jwt.sign({ _id: this._id }, JWT_SECRET_KEY, {
    expiresIn: "1d",
  });
  return accessToken;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
