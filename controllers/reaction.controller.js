const {
  AppError,
  catchAsync,
  sendResponse,
} = require("../helpers/utils.helper");
const Reaction = require("../models/Reaction");
const mongoose = require("mongoose");

const reactionController = {};

reactionController.saveReaction = catchAsync(async (req, res, next) => {
  // 1. get the value from req.body
  const { targetType, targetId, emoji } = req.body;

  // 2. check if that target Id is existent
  const targetObj = await mongoose.model(targetType).findById(targetId);
  if (!targetObj) {
    // throw new Error(`${targetType} does not exist`);
    return next(
      new AppError(404, `${targetType} not found`, "Create Reaction Error")
    );
  }

  // 3. check if that reaction is existent
  let reaction = await Reaction.findOne({
    targetType,
    targetId,
    user: req.userId,
  });

  // 4. if reaction is not existent, create new one
  let message = "";
  // 5. if reaction is existent
  if (!reaction) {
    await Reaction.create({
      targetType,
      targetId,
      user: req.userId,
      emoji,
    });
    message = "Added reaction";
  } else {
    if (reaction.emoji !== emoji) {
      // 5-1 if existent reaction is different with upcoming then update
      await Reaction.findOneAndUpdate({ _id: reaction._id }, { emoji });
      message = "Updated reaction";
    } else {
      // 5-2 if it's the same, delete
      await Reaction.findOneAndDelete({ _id: reaction._id });
      message = "Removed reaction";
    }
  }

  // 6. Get the updated number of reactions in the targetType
  const reactionState = await mongoose
    .model(targetType)
    .findById(targetId, "reactions");

  return sendResponse(res, 200, true, reactionState.reactions, null, message);
});

module.exports = reactionController;
