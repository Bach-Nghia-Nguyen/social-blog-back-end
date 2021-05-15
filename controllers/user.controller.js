const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const Friendship = require("../models/Friendship");
const utilsHelper = require("../helpers/utils.helper");
const { emailHelper } = require("../helpers/email.helper");

const userController = {};

userController.register = catchAsync(async (req, res, next) => {
  let { name, email, avatarUrl, password } = req.body;
  let user = await User.findOne({ email });
  if (user) {
    return next(new AppError(409, "User already exists", "Register Error"));
  }

  const salt = await bcrypt.genSalt(10);
  password = await bcrypt.hash(password, salt);

  const emailVerificationCode = utilsHelper.generateRandomHexString(10);

  user = await User.create({
    name,
    email,
    password,
    avatarUrl,
    emailVerified: false,
    emailVerificationCode,
  });
  const accessToken = await user.generateToken();

  // time to send email with verification
  const verificationURL = `${process.env.FRONTEND_URL}/verify/${emailVerificationCode}`;
  const emailData = await emailHelper.renderEmailTemplate(
    "verify_email",
    { name, code: verificationURL },
    email
  );

  if (emailData.error) {
    throw new Error(emailData.error);
  } else {
    emailHelper.send(emailData);
  }

  return sendResponse(res, 200, true, { user }, null, "Create user successful");
});

userController.updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const allows = ["name", "password", "avatarUrl"];
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError(404, "Account not found", "Update Profile Error"));
  }

  allows.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });
  await user.save();
  return sendResponse(res, 200, true, user, null, "Update Profile success");
});

userController.getUsers = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, ...filter } = { ...req.query };
  const currentUserId = req.userId;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const totalUsers = await User.countDocuments({
    ...filter,
    isDeleted: false,
  });
  const totalPages = Math.ceil(totalUsers / limit);
  const offset = limit * (page - 1);

  let users = await User.find(filter)
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit);

  const promises = users.map(async (user) => {
    let temp = user.toJSON();
    temp.friendship = await Friendship.findOne(
      {
        $or: [
          { from: currentUserId, to: user._id },
          { from: user._id, to: currentUserId },
        ],
      },
      "-_id status updatedAt"
    );
    return temp;
  });

  const usersWithFriendship = await Promise.all(promises);
  console.log("users with friendship: ", usersWithFriendship);

  return sendResponse(
    res,
    200,
    true,
    { users: usersWithFriendship, totalPages },
    null,
    "Get users success"
  );
});

userController.getCurrentUser = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError(400, "User not found", "Get Current User Error"));
  }

  return sendResponse(res, 200, true, user, null, "Get current user success");
});

userController.sendFriendRequest = catchAsync(async (req, res, next) => {
  const userId = req.userId; // From
  const toUserId = req.params.id; // To

  const user = await User.findById(toUserId);
  if (!user) {
    return next(
      new AppError(400, "User not found", "Send Friend Request Error")
    );
  }

  let friendship = await Friendship.findOne({
    $or: [
      { from: toUserId, to: userId },
      { from: userId, to: toUserId },
    ],
  });
  if (!friendship) {
    await Friendship.create({
      from: userId,
      to: toUserId,
      status: "requesting",
    });

    return sendResponse(
      res,
      200,
      true,
      friendship, //null,
      null,
      "Friend Request has been sent"
    );
  } else {
    switch (friendship.status) {
      case "requesting":
        if (friendship.from.equals(userId)) {
          return next(
            new AppError(
              400,
              "You have already sent a request to this user",
              "Add Friend error"
            )
          );
        } else {
          return next(
            new AppError(
              400,
              "You have received a request from this user",
              "Add Friend Error"
            )
          );
        }

      case "accepted":
        return next(
          new AppError(400, "Users are already friends", "Add Friend Error")
        );

      case "removed":
      case "decline":
      case "cancel":
        friendship.from = userId;
        friendship.to = toUserId;
        friendship.status = "requesting";
        await friendship.save();
        return sendResponse(
          res,
          200,
          true,
          friendship, // null,
          null,
          "Friend Request has been sent"
        );

      default:
        break;
    }
  }
});

userController.acceptFriendRequest = catchAsync(async (req, res, next) => {
  const userId = req.userId; // To
  const fromUserId = req.params.id; // From
  let friendship = await Friendship.findOne({
    from: fromUserId,
    to: userId,
    status: "requesting",
  });
  if (!friendship) {
    return next(
      new AppError(
        404,
        "Friend Request not found",
        "Accept Friend Request Error"
      )
    );
  }

  friendship.status = "accepted";
  await friendship.save();

  return sendResponse(
    res,
    200,
    true,
    friendship,
    null,
    "Accept Friend Request success"
  );
});

userController.declineFriendRequest = catchAsync(async (req, res, next) => {
  const userId = req.userId; // To
  const fromUserId = req.params.id; // From
  let friendship = await Friendship.findOne({
    from: fromUserId,
    to: userId,
    status: "requesting",
  });
  if (!friendship) {
    return next(
      new AppError(404, "Request not found", "Decline Friend Request Error")
    );
  }

  friendship.status = "decline";
  await friendship.save();
  return sendResponse(
    res,
    200,
    true,
    null,
    null,
    "Decline Friend request success"
  );
});

userController.getFriendList = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, ...filter } = { ...req.query };
  const userId = req.userId;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  let friendList = await Friendship.find({
    $or: [{ from: userId }, { to: userId }],
    status: "accepted",
  });

  const friendIDs = friendList.map((friendship) => {
    if (friendship.from._id.equals(userId)) return friendship.to;
    return friendship.from;
  });

  const totalFriends = await User.countDocuments({
    ...filter,
    isDeleted: false,
    _id: { $in: friendIDs },
  });
  const totalPages = Math.ceil(totalFriends / limit);
  const offset = limit * (page - 1);

  let users = await User.find({ ...filter, _id: { $in: friendIDs } })
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit);

  const promises = users.map(async (user) => {
    let temp = user.toJSON();
    temp.friendShip = friendList.find((friendship) => {
      if (friendship.from.equals(user._id) || friendship.to.equals(user._id)) {
        return { status: friendship.status };
      }
      return false;
    });
    return temp;
  });
  const usersWithFriendship = await Promise.all(promises);

  return sendResponse(
    res,
    200,
    true,
    { users: usersWithFriendship, totalPages },
    null,
    null
  );
});

userController.getSentFriendRequestList = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, ...filter } = { ...req.query };
  const userId = req.userId;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  let requestList = await Friendship.find({
    from: userId,
    status: "requesting",
  });

  const recipientIDs = requestList.map((friendship) => {
    if (friendship.from._id.equals(userId)) return friendship.to;
    return friendship.from;
  });

  const totalRequests = await User.countDocuments({
    ...filter,
    isDeleted: false,
    _id: { $in: recipientIDs },
  });
  const totalPages = Math.ceil(totalRequests / limit);
  const offset = limit * (page - 1);

  let users = await User.find({ ...filter, _id: { $in: recipientIDs } })
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit);

  const promises = users.map(async (user) => {
    let temp = user.toJSON();
    temp.friendship = requestList.find((friendship) => {
      if (friendship.from.equals(user._id) || friendship.to.equals(user._id)) {
        return { status: friendship.status };
      }
      return false;
    });
    return temp;
  });
  const usersWithFriendship = await Promise.all(promises);

  return sendResponse(
    res,
    200,
    true,
    { users: usersWithFriendship, totalPages },
    null,
    null
  );
});

userController.getReceivedFriendRequestList = catchAsync(
  async (req, res, next) => {
    let { page, limit, sortBy, ...filter } = { ...req.query };
    const userId = req.userId;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    let requestList = await Friendship.find({
      to: userId,
      status: "requesting",
    });

    const requesterIDs = requestList.map((friendship) => {
      if (friendship.from._id.equals(userId)) return friendship.to;
      return friendship.from;
    });

    const totalRequests = await User.countDocuments({
      ...filter,
      isDeleted: false,
      _id: { $in: requesterIDs },
    });
    const totalPages = Math.ceil(totalRequests / limit);
    const offset = limit * (page - 1);

    let users = await User.find({ ...filter, _id: { $in: requesterIDs } })
      .sort({ ...sortBy, createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const promises = users.map(async (user) => {
      let temp = user.toJSON();
      temp.friendship = requestList.find((friendship) => {
        if (
          friendship.from.equals(user._id) ||
          friendship.to.equals(user._id)
        ) {
          return { status: friendship.status };
        }
        return false;
      });
      return temp;
    });
    const usersWithFriendship = await Promise.all(promises);

    return sendResponse(
      res,
      200,
      true,
      { users: usersWithFriendship, totalPages },
      null,
      null
    );
  }
);

userController.cancelFriendRequest = catchAsync(async (req, res, next) => {
  const userId = req.userId; // From
  const toUserId = req.params.id; // To
  let friendship = await Friendship.findOne({
    from: userId,
    to: toUserId,
    status: "requesting",
  });
  if (!friendship) {
    return next(
      new AppError(404, "Request not found", "Cancel Friend Request Error")
    );
  }

  friendship.status = "cancel";
  await friendship.save();

  return sendResponse(
    res,
    200,
    true,
    friendship, //null,
    null,
    "Friend request has been cancelled"
  );
});

userController.removeFriendship = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const toBeRemovedUserId = req.params.id;
  let friendship = await Friendship.findOne({
    $or: [
      { from: userId, to: toBeRemovedUserId },
      { from: toBeRemovedUserId, to: userId },
    ],
    status: "accepted",
  });
  if (!friendship) {
    return next(new AppError(404, "Friend not found", "Remove Friend Error"));
  }

  friendship.status = "removed";
  await friendship.save();
  return sendResponse(
    res,
    200,
    true,
    friendship,
    null,
    "Remove friendship success"
  );
});

module.exports = userController;
