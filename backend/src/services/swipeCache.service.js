const mongoose = require("mongoose");
const Swipe = require("../models/Swipe");
const { getRedisClient } = require("../config/redis");

const EXCLUDED_KEY_PREFIX = "swipe:excluded";
const EXCLUDED_TTL_SECONDS = 24 * 60 * 60;

function buildSwipeExcludedKey(userId) {
  return `${EXCLUDED_KEY_PREFIX}:${userId.toString()}`;
}

function getUsableRedisClient() {
  const client = getRedisClient();

  if (!client || client.isOpen === false) {
    return null;
  }

  return client;
}

function normalizeCachedIds(ids = []) {
  return ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
}

async function getExcludedSwipeIdsFromMongo(userId) {
  const swipes = await Swipe.find({ swiper: userId }).select("target").lean();
  return swipes.map((swipe) => swipe.target.toString());
}

async function writeExcludedSwipeIdsToRedis(client, userId, targetIds) {
  if (!targetIds.length) {
    return null;
  }

  const key = buildSwipeExcludedKey(userId);

  await client.sAdd(key, targetIds);
  await client.expire(key, EXCLUDED_TTL_SECONDS);

  return key;
}

async function getExcludedSwipeIds(userId) {
  const client = getUsableRedisClient();

  if (!client) {
    return getExcludedSwipeIdsFromMongo(userId);
  }

  const key = buildSwipeExcludedKey(userId);

  try {
    const keyExists = await client.exists(key);

    if (keyExists) {
      return normalizeCachedIds(await client.sMembers(key));
    }

    const targetIds = await getExcludedSwipeIdsFromMongo(userId);
    await writeExcludedSwipeIdsToRedis(client, userId, targetIds);
    return targetIds;
  } catch (error) {
    console.warn("Redis swipe cache unavailable, falling back to MongoDB:", error.message);
    return getExcludedSwipeIdsFromMongo(userId);
  }
}

async function addExcludedSwipeId(userId, targetId) {
  const client = getUsableRedisClient();

  if (!client) {
    return false;
  }

  try {
    await writeExcludedSwipeIdsToRedis(client, userId, [targetId.toString()]);
    return true;
  } catch (error) {
    console.warn("Failed to update Redis swipe exclusion cache:", error.message);
    return false;
  }
}

module.exports = {
  EXCLUDED_TTL_SECONDS,
  buildSwipeExcludedKey,
  getExcludedSwipeIds,
  addExcludedSwipeId,
};
