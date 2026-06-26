const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");
const { createOrUpdateSwipe, getDiscoveryCandidates } = require("../services/matching.service");

const discover = asyncHandler(async (req, res) => {
  const candidates = await getDiscoveryCandidates(req.user, req.query.limit);
  res.json({ users: candidates });
});

const swipe = asyncHandler(async (req, res) => {
  const { targetUserId, direction } = req.body;

  if (!targetUserId || !["like", "nope", "superlike"].includes(direction)) {
    throw httpError(400, "targetUserId and a valid direction are required");
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
  });
});

module.exports = {
  discover,
  swipe,
};
