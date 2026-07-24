const mongoose = require("mongoose");
const Match = require("../models/Match");
const Swipe = require("../models/Swipe");
const User = require("../models/User");
const { buildGeoNearStage } = require("./geo.service");
const {
  addExcludedSwipeId,
  getExcludedSwipeIds,
} = require("./swipeCache.service");
const { userExists } = require("./userExistenceCache.service");
const httpError = require("../utils/httpError");

const MATCH_USER_SELECT = "name birthDate bio photos interests jobTitle school isVerified";
const IDEMPOTENCY_CACHE_TTL_MS = 5 * 60 * 1000;
const ALLOWED_GENDERS = ["woman", "man", "nonbinary", "other"];
const swipeStateCache = new Map();
const activeMatchCache = new Map();

function isPositiveSwipe(direction) {
  return direction === "like" || direction === "superlike";
}

function buildParticipantsKey(userA, userB) {
  return [userA.toString(), userB.toString()].sort().join(":");
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function readCache(cache, key) {
  const cached = cache.get(key);

  if (!cached || cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.value;
}

function writeCache(cache, key, value) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + IDEMPOTENCY_CACHE_TTL_MS,
  });
}

function buildSwipeStateKey(userId, targetId) {
  return `${userId.toString()}:${targetId.toString()}`;
}

async function upsertSwipe(userId, targetId, direction) {
  const filter = { swiper: userId, target: targetId };
  const cacheKey = buildSwipeStateKey(userId, targetId);
  const cachedSwipe = readCache(swipeStateCache, cacheKey);

  if (cachedSwipe?.direction === direction) {
    return cachedSwipe;
  }

  try {
    const swipe = await Swipe.findOneAndUpdate(
      filter,
      { direction },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
    ).lean();
    writeCache(swipeStateCache, cacheKey, swipe);
    return swipe;
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const swipe = await Swipe.findOneAndUpdate(
      filter,
      { direction },
      { returnDocument: "after" },
    ).lean();
    writeCache(swipeStateCache, cacheKey, swipe);
    return swipe;
  }
}

async function upsertMatch(userId, targetId, participantsKey) {
  const cachedMatch = readCache(activeMatchCache, participantsKey);
  if (cachedMatch) {
    return cachedMatch;
  }

  const existingMatch = await Match.findOne({
    participantsKey,
    status: "active",
  }).populate("users", MATCH_USER_SELECT);

  if (existingMatch) {
    writeCache(activeMatchCache, participantsKey, existingMatch);
    return existingMatch;
  }

  try {
    const createdMatch = await Match.create({
      users: [userId, targetId],
      participantsKey,
      matchedAt: new Date(),
    });

    const populatedMatch = await createdMatch.populate("users", MATCH_USER_SELECT);
    writeCache(activeMatchCache, participantsKey, populatedMatch);
    return populatedMatch;
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const match = await Match.findOneAndUpdate(
      { participantsKey },
      {
        $set: {
          status: "active",
          unmatchedBy: null,
        },
      },
      { returnDocument: "after" },
    ).populate("users", MATCH_USER_SELECT);
    writeCache(activeMatchCache, participantsKey, match);
    return match;
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

function buildDiscoveryMatchStage(user, skippedIds = [], options = {}) {
  const matchStage = {
    _id: { $nin: skippedIds },
    gender: { $in: user.interestedIn?.length ? user.interestedIn : ALLOWED_GENDERS },
    interestedIn: user.gender,
  };

  if (!options.ignoreAgeRange) {
    matchStage.birthDate = buildBirthDateFilter(user.preferences?.ageRange);
  }

  return matchStage;
}

function calculateAge(birthDate) {
  if (!birthDate) {
    return null;
  }

  return Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970);
}

function formatDiscoveryCandidate(user) {
  const id = user._id.toString();

  return {
    ...user,
    _id: id,
    id,
    age: calculateAge(user.birthDate),
    distanceMeters: user.distanceMeters !== undefined
      ? Math.round(user.distanceMeters)
      : undefined,
    distanceKm: user.distanceMeters !== undefined
      ? Number((user.distanceMeters / 1000).toFixed(2))
      : user.distanceKm,
  };
}

async function runDiscoveryQuery(user, skippedIds, limit, options = {}) {
  const matchStage = buildDiscoveryMatchStage(user, skippedIds, options);

  const geoStage = buildGeoNearStage(user, user.preferences?.maxDistanceKm, {
    ignoreMaxDistance: options.ignoreDistance,
  });
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

  const candidates = await User.aggregate(pipeline);
  return candidates.map(formatDiscoveryCandidate);
}

async function getDiscoveryCandidates(user, limit = 20) {
  const requestedLimit = normalizeLimit(limit);
  const excludedSwipeIds = await getExcludedSwipeIds(user._id);
  const skippedIds = excludedSwipeIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  skippedIds.push(user._id);

  const strictCandidates = await runDiscoveryQuery(user, skippedIds, requestedLimit);

  if (strictCandidates.length >= requestedLimit) {
    return strictCandidates;
  }

  const canExpandDistance = user.preferences?.expandDistance !== false;
  const canExpandAge = user.preferences?.expandAge !== false;

  if (!canExpandDistance && !canExpandAge) {
    return strictCandidates;
  }

  const relaxedSkippedIds = [
    ...skippedIds,
    ...strictCandidates.map((candidate) => new mongoose.Types.ObjectId(candidate._id)),
  ];
  const relaxedCandidates = await runDiscoveryQuery(
    user,
    relaxedSkippedIds,
    requestedLimit - strictCandidates.length,
    {
      ignoreDistance: canExpandDistance,
      ignoreAgeRange: canExpandAge,
    },
  );

  return [...strictCandidates, ...relaxedCandidates];
}

async function createOrUpdateSwipe(userId, targetId, direction) {
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw httpError(400, "Invalid target user id");
  }

  if (userId.toString() === targetId.toString()) {
    throw httpError(400, "You cannot swipe on yourself");
  }

  if (!(await userExists(targetId))) {
    throw httpError(404, "Target user not found");
  }

  const swipe = await upsertSwipe(userId, targetId, direction);
  await addExcludedSwipeId(userId, targetId);

  let match = null;

  if (isPositiveSwipe(direction)) {
    const reciprocalCacheKey = buildSwipeStateKey(targetId, userId);
    const cachedReciprocalSwipe = readCache(swipeStateCache, reciprocalCacheKey);
    const reciprocalSwipe = isPositiveSwipe(cachedReciprocalSwipe?.direction)
      ? cachedReciprocalSwipe
      : await Swipe.findOne({
        swiper: targetId,
        target: userId,
        direction: { $in: ["like", "superlike"] },
      }).lean();

    if (reciprocalSwipe) {
      writeCache(swipeStateCache, reciprocalCacheKey, reciprocalSwipe);
    }

    if (reciprocalSwipe) {
      const participantsKey = buildParticipantsKey(userId, targetId);
      match = await upsertMatch(userId, targetId, participantsKey);
    }
  }

  return { swipe, match };
}

async function listMatches(userId) {
  return Match.find({ users: userId, status: "active" })
    .populate("users", `${MATCH_USER_SELECT} lastActive`)
    .sort({ updatedAt: -1 });
}

module.exports = {
  getDiscoveryCandidates,
  createOrUpdateSwipe,
  listMatches,
  buildParticipantsKey,
  normalizeLimit,
  buildBirthDateFilter,
  buildDiscoveryMatchStage,
  calculateAge,
  formatDiscoveryCandidate,
};
