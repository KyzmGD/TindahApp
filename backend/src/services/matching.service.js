const mongoose = require("mongoose");
const Match = require("../models/Match");
const Swipe = require("../models/Swipe");
const User = require("../models/User");
const { buildGeoNearStage } = require("./geo.service");
const httpError = require("../utils/httpError");

function isPositiveSwipe(direction) {
  return direction === "like" || direction === "superlike";
}

function buildParticipantsKey(userA, userB) {
  return [userA.toString(), userB.toString()].sort().join(":");
}

function normalizeLimit(limit, fallback = 20, max = 50) {
  const parsed = Number(limit);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function buildBirthDateFilter(ageRange = {}) {
  const minAge = Number(ageRange.min) || 18;
  const maxAge = Number(ageRange.max) || 100;
  const today = new Date();
  const youngestBirthDate = new Date(today);
  const oldestBirthDate = new Date(today);

  youngestBirthDate.setFullYear(today.getFullYear() - minAge);
  oldestBirthDate.setFullYear(today.getFullYear() - maxAge - 1);
  oldestBirthDate.setDate(oldestBirthDate.getDate() + 1);

  return {
    $gte: oldestBirthDate,
    $lte: youngestBirthDate,
  };
}

async function getDiscoveryCandidates(user, limit = 20) {
  const swipes = await Swipe.find({ swiper: user._id }).select("target");
  const skippedIds = swipes.map((swipe) => swipe.target);
  skippedIds.push(user._id);

  const matchStage = {
    _id: { $nin: skippedIds },
    gender: { $in: user.interestedIn?.length ? user.interestedIn : ["woman", "man", "nonbinary", "other"] },
    interestedIn: user.gender,
    birthDate: buildBirthDateFilter(user.preferences?.ageRange),
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
    { $sample: { size: normalizeLimit(limit) } },
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
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );

  let match = null;

  if (isPositiveSwipe(direction)) {
    const reciprocalSwipe = await Swipe.findOne({
      swiper: targetId,
      target: userId,
      direction: { $in: ["like", "superlike"] },
    });

    if (reciprocalSwipe) {
      const participantsKey = buildParticipantsKey(userId, targetId);

      match = await Match.findOneAndUpdate(
        {
          participantsKey,
        },
        {
          $setOnInsert: {
            users: [userId, targetId],
            participantsKey,
            matchedAt: new Date(),
          },
          $set: {
            status: "active",
            unmatchedBy: null,
          },
        },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
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
  buildParticipantsKey,
  normalizeLimit,
  buildBirthDateFilter,
};
