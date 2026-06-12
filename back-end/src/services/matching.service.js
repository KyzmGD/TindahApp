const mongoose = require("mongoose");
const Match = require("../models/Match");
const Swipe = require("../models/Swipe");
const User = require("../models/User");
const { buildGeoNearStage } = require("./geo.service");
const httpError = require("../utils/httpError");

function isPositiveSwipe(direction) {
  return direction === "like" || direction === "superlike";
}

async function getDiscoveryCandidates(user, limit = 20) {
  const swipes = await Swipe.find({ swiper: user._id }).select("target");
  const skippedIds = swipes.map((swipe) => swipe.target);
  skippedIds.push(user._id);

  const matchStage = {
    _id: { $nin: skippedIds },
    gender: { $in: user.interestedIn?.length ? user.interestedIn : ["woman", "man", "nonbinary", "other"] },
  };

  const geoStage = buildGeoNearStage(user, user.preferences?.maxDistanceKm);
  const pipeline = [];

  if (geoStage) {
    pipeline.push(geoStage);
    pipeline.push({ $match: matchStage });
  } else {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push(
    { $sample: { size: Number(limit) || 20 } },
    {
      $project: {
        passwordHash: 0,
        email: 0,
        __v: 0,
      },
    },
  );

  return User.aggregate(pipeline);
}

async function createOrUpdateSwipe(userId, targetId, direction) {
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw httpError(400, "Invalid target user id");
  }

  if (userId.toString() === targetId.toString()) {
    throw httpError(400, "You cannot swipe on yourself");
  }

  const target = await User.findById(targetId);
  if (!target) {
    throw httpError(404, "Target user not found");
  }

  const swipe = await Swipe.findOneAndUpdate(
    { swiper: userId, target: targetId },
    { direction },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  let match = null;

  if (isPositiveSwipe(direction)) {
    const reciprocalSwipe = await Swipe.findOne({
      swiper: targetId,
      target: userId,
      direction: { $in: ["like", "superlike"] },
    });

    if (reciprocalSwipe) {
      match = await Match.findOneAndUpdate(
        {
          users: { $all: [userId, targetId] },
        },
        {
          $setOnInsert: {
            users: [userId, targetId],
            matchedAt: new Date(),
          },
          status: "active",
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).populate("users", "name birthDate bio photos interests jobTitle school isVerified");
    }
  }

  return { swipe, match };
}

async function listMatches(userId) {
  return Match.find({ users: userId, status: "active" })
    .populate("users", "name birthDate bio photos interests jobTitle school isVerified lastActive")
    .sort({ updatedAt: -1 });
}

module.exports = {
  getDiscoveryCandidates,
  createOrUpdateSwipe,
  listMatches,
};
