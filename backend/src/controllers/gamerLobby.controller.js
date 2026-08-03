const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");
const {
  closeRecruitment,
  createRecruitment,
  exploreGamerLobby,
  joinRecruitment,
  listRecruitments,
  validateRecruitmentPayload,
  validateGamerLobbyQuery,
} = require("../services/gamerLobby.service");

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
  if (ownerId) {
    const io = req.app.get("io");
    io?.to(`user:${ownerId}`).emit("gamer_lobby:team_found", result);
    io?.to(`user:${ownerId}`).emit("gamer_lobby:recruitment_updated", result.recruitment);
  }

  res.status(201).json(result);
});

module.exports = {
  explore,
  closeRecruitmentPost,
  getRecruitments,
  joinRecruitmentPost,
  postRecruitment,
};
