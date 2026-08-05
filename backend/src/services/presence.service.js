const Match = require("../models/Match");
const User = require("../models/User");
const { getRedisClient } = require("../config/redis");

const PRESENCE_KEY_PREFIX = "presence:online:";
const PRESENCE_TTL_SECONDS = 5 * 60;
const socketCountsByUser = new Map();

function getIdString(value) {
  if (!value) {
    return "";
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
}

function getPresenceKey(userId) {
  return `${PRESENCE_KEY_PREFIX}${getIdString(userId)}`;
}

async function setRedisOnline(userId) {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    await redis.set(getPresenceKey(userId), "1", { EX: PRESENCE_TTL_SECONDS });
  } catch (error) {
    console.warn("Redis presence set failed:", error.message);
  }
}

async function clearRedisOnline(userId) {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    await redis.del(getPresenceKey(userId));
  } catch (error) {
    console.warn("Redis presence delete failed:", error.message);
  }
}

async function markUserOnline(userId) {
  const normalizedUserId = getIdString(userId);
  const count = (socketCountsByUser.get(normalizedUserId) || 0) + 1;
  socketCountsByUser.set(normalizedUserId, count);

  const lastActive = new Date();
  await Promise.all([
    setRedisOnline(normalizedUserId),
    User.findByIdAndUpdate(normalizedUserId, {
      isOnline: true,
      lastActive,
    }),
  ]);

  return { userId: normalizedUserId, isOnline: true, lastActive };
}

async function markUserOfflineIfNoSockets(userId) {
  const normalizedUserId = getIdString(userId);
  const count = Math.max((socketCountsByUser.get(normalizedUserId) || 1) - 1, 0);

  if (count > 0) {
    socketCountsByUser.set(normalizedUserId, count);
    return null;
  }

  socketCountsByUser.delete(normalizedUserId);
  const lastActive = new Date();
  await Promise.all([
    clearRedisOnline(normalizedUserId),
    User.findByIdAndUpdate(normalizedUserId, {
      isOnline: false,
      lastActive,
    }),
  ]);

  return { userId: normalizedUserId, isOnline: false, lastActive };
}

async function getPresenceSnapshot(userIds) {
  const normalizedIds = [...new Set((userIds || []).map(getIdString).filter(Boolean))];

  if (!normalizedIds.length) {
    return [];
  }

  const users = await User.find({ _id: { $in: normalizedIds } })
    .select("isOnline lastActive")
    .lean();
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));

  return normalizedIds.map((userId) => {
    const user = usersById.get(userId);

    return {
      userId,
      isOnline: Boolean(user?.isOnline),
      lastActive: user?.lastActive || null,
    };
  });
}

async function emitPresenceToActiveMatchRooms(io, presence) {
  if (!io || !presence?.userId) {
    return;
  }

  const matches = await Match.find({
    users: presence.userId,
    status: "active",
  }).select("_id").lean();

  matches.forEach((match) => {
    const matchId = match._id.toString();
    io.to(matchId).emit("presence:update", presence);
    io.to(`presence:${matchId}`).emit("presence:update", presence);
  });
}

function resetPresenceForTesting() {
  socketCountsByUser.clear();
}

module.exports = {
  emitPresenceToActiveMatchRooms,
  getPresenceSnapshot,
  markUserOfflineIfNoSockets,
  markUserOnline,
  resetPresenceForTesting,
};
