const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const authController = {};

authController.loginWithEmail = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }, "+password");
  if (!user) {
    return next(new AppError(400, "Wrong password", "Login Error"));
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return next(new AppError(400, "Wrong password", "Login Error"));
  }

  const accessToken = await user.generateToken();

  return sendResponse(
    res,
    200,
    true,
    { user, accessToken },
    null,
    "Login successfully"
  );
});

authController.loginWithFacebookOrGoogle = async (req, res, next) => {
  try {
    const { user } = req;
    if (user) {
      user = await User.findByIdAndUpdate(
        user._id,
        { avatarUrl: user.avatarUrl }, // i want to get recent avatar photo from facebook
        { new: true }
      );
    } else {
      throw new Error("login fail");
    }

    const accessToken = await user.generateToken();

    res.status(200).json({ status: "success", data: { user, accessToken } });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error.message });
  }
};

module.exports = authController;
