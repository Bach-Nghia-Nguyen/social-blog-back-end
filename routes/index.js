const express = require("express");
const router = express.Router();
const email = require("../helpers/email.helper");

router.get("/test-email", (req, res) => {
  email.sendTestEmail();
  res.send("email sent");
});

// userApi
const userApi = require("./user.api");
router.use("/users", userApi);

// authApi
const authApi = require("./auth.api");
router.use("/auth", authApi);

// blogApi
const blogApi = require("./blog.api");
router.use("/blogs", blogApi);

// reviewApi
const reviewApi = require("./review.api");
router.use("/reviews", reviewApi);

// reactionApi
const reactionApi = require("./reaction.api");
router.use("/reactions", reactionApi);

// friendshipApi
const friendshipApi = require("./friendship.api");
// const { sendTestEmail } = require("../helpers/email.helper");
router.use("/friends", friendshipApi);

module.exports = router;
