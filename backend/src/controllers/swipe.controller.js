const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");
const { createOrUpdateSwipe, getDiscoveryCandidates } = require("../services/matching.service");

const discover = asyncHandler(async (req, res) => {
  const candidates = await getDiscoveryCandidates(req.user, req.query.limit);
  res.json({ users: candidates });
});

function normalizeSwipePayload(body) {
  const targetUserId = body.targetUserId || body.targetId;
  const direction = body.direction || (body.type === "pass" ? "nope" : body.type);

  return { targetUserId, direction };
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
      io?.to(`user:${user._id.toString()}`).emit("match:new", result.match);
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
  swipe,
};
