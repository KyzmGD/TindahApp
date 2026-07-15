const mongoose = require("mongoose");
const User = require("../models/User");

const USER_EXISTS_TTL_MS = 60 * 1000;
const existsCache = new Map();

function readCachedUserExists(userId) {
  const cached = existsCache.get(userId.toString());

  if (!cached || cached.expiresAt <= Date.now()) {
    return null;
  }

  return cached.exists;
}

function writeCachedUserExists(userId, exists) {
  existsCache.set(userId.toString(), {
    exists,
    expiresAt: Date.now() + USER_EXISTS_TTL_MS,
  });
}

async function userExists(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return false;
  }

  const cached = readCachedUserExists(userId);
  if (cached !== null) {
    return cached;
  }

  const exists = Boolean(await User.exists({ _id: userId }));
  writeCachedUserExists(userId, exists);
  return exists;
}

module.exports = {
  USER_EXISTS_TTL_MS,
  userExists,
};
