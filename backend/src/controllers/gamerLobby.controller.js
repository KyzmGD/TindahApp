const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");
const {
  closeRecruitment,
  createRecruitment,
  exploreGamerLobby,
  joinRecruitment,
  leaveRecruitment,
  listRecruitments,
  validateRecruitmentPayload,
  validateGamerLobbyQuery,
} = require("../services/gamerLobby.service");
const { emitLiveLobbyStats, getLiveLobbyStats } = require("../services/liveLobbyStats.service");

const getStats = asyncHandler(async (req, res) => {
  res.json({ stats: await getLiveLobbyStats() });
});

const explore = asyncHandler(async (req, res) => {
  const { errors, filters } = validateGamerLobbyQuery(req.query);

  if (Object.keys(errors).length) {
    throw httpError(400, "Please fix the highlighted fields.", errors);
  }

  const users = await exploreGamerLobby({
    requesterId: req.user._id,
    game: filters.game,
    lobbyGroup: filters.lobbyGroup,
    limit: req.query.limit,
  });

  res.json({
    filters,
    users,
  });
});

const getRecruitments = asyncHandler(async (req, res) => {
  const { errors, filters } = validateGamerLobbyQuery(req.query);

  if (Object.keys(errors).length) {
    throw httpError(400, "Please fix the highlighted fields.", errors);
  }

  const recruitments = await listRecruitments({
    requesterId: req.user._id,
    game: filters.game,
    lobbyGroup: filters.lobbyGroup,
    limit: req.query.limit,
  });

  res.json({
    filters,
    recruitments,
  });
});

const postRecruitment = asyncHandler(async (req, res) => {
  const { errors } = validateRecruitmentPayload(req.body);

  if (Object.keys(errors).length) {
    throw httpError(400, "Please fix the highlighted fields.", errors);
  }

  const recruitment = await createRecruitment({
    ownerId: req.user._id,
    payload: req.body,
  });
  req.app.get("io")?.to(`user:${req.user._id}`).emit("matches:updated");
  await emitLiveLobbyStats(req.app.get("io"));

  res.status(201).json({
    message: "Recruitment post created.",
    recruitment,
  });
});

const closeRecruitmentPost = asyncHandler(async (req, res) => {
  const result = await closeRecruitment({
    ownerId: req.user._id,
    recruitmentId: req.params.recruitmentId,
  });
  const io = req.app.get("io");

  if (result.wasClosed) {
    result.dissolvedUserIds.forEach((userId) => {
      io?.to(`user:${userId}`).emit("gamer_lobby:team_dissolved", {
        message: "Your team has been dissolved",
        recruitment: result.recruitment,
      });
    });
  }

  [req.user._id.toString(), ...(result.dissolvedUserIds || [])].forEach((userId) => {
    io?.to(`user:${userId}`).emit("matches:updated");
  });
  await emitLiveLobbyStats(io);

  res.json({
    message: "Recruitment post closed.",
    recruitment: result.recruitment,
  });
});

const joinRecruitmentPost = asyncHandler(async (req, res) => {
  const result = await joinRecruitment({
    joinerId: req.user._id,
    recruitmentId: req.params.recruitmentId,
  });

  const ownerId = result.teamMatch?.owner?.id;
  const io = req.app.get("io");
  if (ownerId) {
    io?.to(`user:${ownerId}`).emit("gamer_lobby:team_found", result);
    io?.to(`user:${ownerId}`).emit("gamer_lobby:recruitment_updated", result.recruitment);
  }
  (result.recruitment?.members || []).forEach((memberId) => {
    io?.to(`user:${memberId}`).emit("matches:updated", result.chatMatch);
  });
  if (result.chatMatch?._id) {
    io?.to(result.chatMatch._id).emit("team:membership", {
      matchId: result.chatMatch._id,
      match: result.chatMatch,
    });
  }
  await emitLiveLobbyStats(io);

  res.status(201).json(result);
});

const leaveRecruitmentPost = asyncHandler(async (req, res) => {
  const result = await leaveRecruitment({
    userId: req.user._id,
    recruitmentId: req.params.recruitmentId,
  });
  const io = req.app.get("io");
  (result.recruitment?.members || []).forEach((memberId) => {
    io?.to(`user:${memberId}`).emit("matches:updated", result.chatMatch);
  });
  if (result.chatMatch?._id) {
    io?.to(result.chatMatch._id).emit("team:membership", {
      matchId: result.chatMatch._id,
      match: result.chatMatch,
    });
  }
  io?.to(`user:${req.user._id}`).emit("matches:updated", null);
  await emitLiveLobbyStats(io);

  res.json({ message: result.dissolved ? "Team closed." : "You left the team.", ...result });
});

module.exports = {
  explore,
  closeRecruitmentPost,
  getRecruitments,
  getStats,
  joinRecruitmentPost,
  leaveRecruitmentPost,
  postRecruitment,
};
