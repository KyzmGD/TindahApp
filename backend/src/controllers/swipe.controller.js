const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");
const User = require("../models/User");
const { createOrUpdateSwipe, getDiscoveryCandidates } = require("../services/matching.service");
const { sendExpoPushNotifications } = require("../services/notification.service");

const discover = asyncHandler(async (req, res) => {
  const candidates = await getDiscoveryCandidates(req.user, req.query.limit);
  res.json({ users: candidates });
});

function normalizeSwipePayload(body) {
  const targetUserId = body.targetUserId || body.targetId;
  const direction = body.direction || (body.type === "pass" ? "nope" : body.type);

  return { targetUserId, direction };
}

function getUserRoom(userId) {
  return `user:${userId.toString()}`;
}

function isUserConnected(io, userId) {
  if (!io) {
    return false;
  }

  const room = io.sockets?.adapter?.rooms?.get(getUserRoom(userId));
  return Boolean(room?.size);
}

function getMatchedUser(match, userId) {
  return match.users.find(
    (user) => user._id.toString() === userId.toString(),
  );
}

function getOtherMatchedUser(match, currentUserId) {
  return match.users.find(
    (user) => user._id.toString() !== currentUserId.toString(),
  );
}

async function sendOfflineMatchPush({ io, match, actorUser, recipientUser }) {
  try {
    if (!recipientUser || isUserConnected(io, recipientUser._id)) {
      return null;
    }

    const recipientWithTokens = await User.findById(recipientUser._id)
      .select("pushTokens")
      .lean();

    const actorName = actorUser?.name || "Someone";

    return await sendExpoPushNotifications(recipientWithTokens, {
      title: "It's a match!",
      body: `You and ${actorName} liked each other.`,
      data: {
        type: "match",
        matchId: match._id.toString(),
        userId: actorUser?._id?.toString() || "",
      },
      channelId: "matches",
      priority: "high",
    });
  } catch (error) {
    console.error("Match push notification failed:", error.message);
    return null;
  }
}

const swipe = asyncHandler(async (req, res) => {
  const { targetUserId, direction } = normalizeSwipePayload(req.body);

  if (!targetUserId || !["like", "nope", "superlike"].includes(direction)) {
    throw httpError(400, "targetId and a valid type are required");
  }

  const result = await createOrUpdateSwipe(req.user._id, targetUserId, direction);

  if (result.match) {
    const io = req.app.get("io");
    result.match.users.forEach((user) => {
      io?.to(getUserRoom(user._id)).emit("match:new", result.match);
    });

    await sendOfflineMatchPush({
      io,
      match: result.match,
      actorUser: getMatchedUser(result.match, req.user._id),
      recipientUser: getOtherMatchedUser(result.match, req.user._id),
    });
  }

  res.status(201).json({
    swipe: result.swipe,
    match: result.match,
    isMatch: Boolean(result.match),
    matchedUser: result.match
      ? result.match.users.find(
        (u) => u._id.toString() !== req.user._id.toString(),
      )
      : null,
  });
});

module.exports = {
  discover,
  getUserRoom,
  isUserConnected,
  swipe,
};
