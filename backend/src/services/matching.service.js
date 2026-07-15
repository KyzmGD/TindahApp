const mongoose = require("mongoose");
const crypto = require("crypto");
const Match = require("../models/Match");
const Swipe = require("../models/Swipe");
const SwipeLock = require("../models/SwipeLock");
const User = require("../models/User");
const { buildGeoNearStage } = require("./geo.service");
const {
  addExcludedSwipeId,
  getExcludedSwipeIds,
} = require("./swipeCache.service");
const httpError = require("../utils/httpError");

const LOCK_TTL_MS = 5000;
const LOCK_RETRY_MS = 25;
const LOCK_TIMEOUT_MS = 3000;

function isPositiveSwipe(direction) {
  return direction === "like" || direction === "superlike";
}

function buildParticipantsKey(userA, userB) {
  return [userA.toString(), userB.toString()].sort().join(":");
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function acquireSwipePairLock(lockId) {
  const owner = crypto.randomUUID();
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const expiresAt = new Date(Date.now() + LOCK_TTL_MS);

    try {
      await SwipeLock.create({ _id: lockId, owner, expiresAt });
      return { lockId, owner };
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }

    const lock = await SwipeLock.findOneAndUpdate(
      { _id: lockId, expiresAt: { $lte: new Date() } },
      {
        $set: {
          owner,
          expiresAt: new Date(Date.now() + LOCK_TTL_MS),
        },
      },
      { returnDocument: "after" },
    );

    if (lock?.owner === owner) {
      return { lockId, owner };
    }

    await sleep(LOCK_RETRY_MS);
  }

  throw httpError(503, "Swipe is being processed. Please retry shortly.");
}

async function releaseSwipePairLock(lock) {
  try {
    await SwipeLock.deleteOne({ _id: lock.lockId, owner: lock.owner });
  } catch (error) {
    console.warn("Failed to release swipe lock:", error.message);
  }
}

async function withSwipePairLock(lockId, handler) {
  const lock = await acquireSwipePairLock(lockId);

  try {
    return await handler();
  } finally {
    await releaseSwipePairLock(lock);
  }
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
  const excludedSwipeIds = await getExcludedSwipeIds(user._id);
  const skippedIds = excludedSwipeIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
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

  const participantsKey = buildParticipantsKey(userId, targetId);

  return withSwipePairLock(participantsKey, async () => {
    const swipe = await Swipe.findOneAndUpdate(
      { swiper: userId, target: targetId },
      { direction },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    );
    await addExcludedSwipeId(userId, targetId);

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
  });
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
  withSwipePairLock,
  normalizeLimit,
  buildBirthDateFilter,
};
