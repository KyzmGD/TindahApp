const User = require("../models/User");
const GamerRecruitment = require("../models/GamerRecruitment");
const GamerTeamMatch = require("../models/GamerTeamMatch");
const Match = require("../models/Match");
const {
  GAME_NAMES,
  LOBBY_GROUPS,
  getLobbyGroupForRank,
} = require("./gamingLobby.service");
const httpError = require("../utils/httpError");

const PLAY_MODES = ["ranked", "casual"];
const TEAM_SIZES = [2, 4];
const GAMER_USER_SELECT = "name birthDate bio avatarUrl photos isOnline lastActive gamingProfiles interests jobTitle school isVerified";
const LOBBY_CODE_GAMES = ["Valorant", "FreeFire", "LienQuan"];

function normalizeLobbyGroup(lobbyGroup) {
  const normalized = String(lobbyGroup || "").trim().toLowerCase();

  if (["group1", "group2", "group3"].includes(normalized)) {
    return normalized;
  }

  if (/^group\s*[123]$/.test(normalized)) {
    return normalized.replace(/\s+/g, "");
  }

  return normalized;
}

function validateGamerLobbyQuery(query = {}) {
  const game = String(query.game || "").trim();
  const lobbyGroup = normalizeLobbyGroup(query.lobbyGroup);
  const errors = {};

  if (!GAME_NAMES.includes(game)) {
    errors.game = "Select a supported game.";
  }

  if (!LOBBY_GROUPS.includes(lobbyGroup)) {
    errors.lobbyGroup = "Select a supported lobby group.";
  }

  return {
    errors,
    filters: {
      game,
      lobbyGroup,
    },
  };
}

function normalizeLimit(limit, fallback = 20, max = 50) {
  const parsed = Number(limit);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function getMatchedGamingProfile(user, filters) {
  return (user.gamingProfiles || []).find(
    (profile) =>
      profile.gameName === filters.game &&
      profile.lobbyGroup === filters.lobbyGroup,
  );
}

function mapGamerLobbyUser(user, filters) {
  const matchedGamingProfile = getMatchedGamingProfile(user, filters);

  return {
    id: user._id.toString(),
    _id: user._id.toString(),
    name: user.name,
    age: user.age,
    gender: user.gender,
    bio: user.bio,
    interests: user.interests,
    avatarUrl: user.avatarUrl,
    photos: user.photos,
    isOnline: user.isOnline,
    lastActive: user.lastActive,
    gamingProfile: matchedGamingProfile,
    gamingProfiles: user.gamingProfiles,
  };
}

function validateRecruitmentPayload(payload = {}) {
  const gameName = String(payload.gameName || payload.game || "").trim();
  const currentRank = String(payload.currentRank || "").trim();
  const lobbyGroup = getLobbyGroupForRank(gameName, currentRank);
  const teamSize = Number(payload.teamSize);
  const playMode = String(payload.playMode || "").trim().toLowerCase();
  const lobbyCode = String(payload.lobbyCode || "")
    .trim()
    .toUpperCase();
  const teamName = String(payload.teamName ?? payload.team ?? payload.title ?? "").trim();
  const description = String(
    payload.description ?? payload.desc ?? payload.note ?? "",
  ).trim();
  const errors = {};

  if (!GAME_NAMES.includes(gameName)) {
    errors.gameName = "Select a supported game.";
  }

  if (!currentRank) {
    errors.currentRank = "Current rank is required.";
  } else if (!lobbyGroup) {
    errors.currentRank = "Current rank does not match the selected game.";
  }

  if (!TEAM_SIZES.includes(teamSize)) {
    errors.teamSize = "Team size must be 2 or 4.";
  }

  if (!PLAY_MODES.includes(playMode)) {
    errors.playMode = "Play mode must be ranked or casual.";
  }

  if (LOBBY_CODE_GAMES.includes(gameName)) {
    if (!lobbyCode) {
      errors.lobbyCode = `${gameName} lobby code is required.`;
    } else if (gameName === "Valorant" && !/^[A-Z0-9]{6}$/.test(lobbyCode)) {
      errors.lobbyCode = "Valorant lobby code must contain exactly 6 letters or numbers.";
    } else if (["FreeFire", "LienQuan"].includes(gameName) && !/^\d{6}$/.test(lobbyCode)) {
      errors.lobbyCode = `${gameName} lobby code must contain exactly 6 digits.`;
    }
  } else if (lobbyCode && !/^[A-Z0-9]{1,6}$/.test(lobbyCode)) {
    errors.lobbyCode = "Lobby code can contain up to 6 letters or numbers.";
  }

  if (!teamName) {
    errors.teamName = "Team name is required.";
  } else if (teamName.length > 60) {
    errors.teamName = "Team name must be 60 characters or fewer.";
  }

  if (description.length > 300) {
    errors.description = "Description must be 300 characters or fewer.";
  }

  return {
    errors,
    values: {
      gameName,
      currentRank,
      lobbyGroup,
      teamSize,
      playMode,
      lobbyCode,
      teamName,
      note: description.slice(0, 160),
      description,
    },
  };
}

function mapRecruitmentPost(post) {
  const owner = post.owner || {};
  const members = post.members || [];
  const memberCount = post.memberCount || Math.max(1, members.length || 1);

  return {
    id: post._id.toString(),
    _id: post._id.toString(),
    owner: {
      id: owner._id?.toString(),
      _id: owner._id?.toString(),
      name: owner.name,
      age: owner.age,
      avatarUrl: owner.avatarUrl,
      photos: owner.photos,
      isOnline: owner.isOnline,
      lastActive: owner.lastActive,
    },
    gameName: post.gameName,
    currentRank: post.currentRank,
    lobbyGroup: post.lobbyGroup,
    teamSize: post.teamSize,
    members: members.map((member) => member._id?.toString?.() || member.toString()),
    memberCount,
    slotsRemaining: Math.max(0, (post.teamSize || 0) - memberCount),
    playMode: post.playMode,
    lobbyCode: post.lobbyCode || "",
    teamName: post.teamName || "",
    description: post.description || post.note || "",
    note: post.description || post.note || "",
    status: post.status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function mapGamerTeamMatch(teamMatch) {
  return {
    id: teamMatch._id.toString(),
    _id: teamMatch._id.toString(),
    recruitment: teamMatch.recruitment?._id?.toString?.() || teamMatch.recruitment?.toString(),
    users: (teamMatch.users || []).map((user) => user._id?.toString?.() || user.toString()),
    owner: teamMatch.owner?._id
      ? mapGamerLobbyOwner(teamMatch.owner)
      : { id: teamMatch.owner?.toString?.(), _id: teamMatch.owner?.toString?.() },
    joiner: teamMatch.joiner?._id
      ? mapGamerLobbyOwner(teamMatch.joiner)
      : { id: teamMatch.joiner?.toString?.(), _id: teamMatch.joiner?.toString?.() },
    participantsKey: teamMatch.participantsKey,
    gameName: teamMatch.gameName,
    currentRank: teamMatch.currentRank,
    lobbyGroup: teamMatch.lobbyGroup,
    teamSize: teamMatch.teamSize,
    playMode: teamMatch.playMode,
    lobbyCode: teamMatch.lobbyCode || "",
    teamName: teamMatch.teamName || "",
    description: teamMatch.description,
    status: teamMatch.status,
    matchedAt: teamMatch.matchedAt,
  };
}

function mapChatMatch(match) {
  if (!match) {
    return null;
  }

  return {
    id: match._id.toString(),
    _id: match._id.toString(),
    users: (match.users || []).map((user) => ({
      id: user._id?.toString?.() || user.toString(),
      _id: user._id?.toString?.() || user.toString(),
      name: user.name,
      age: user.age,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      photos: user.photos,
      isOnline: user.isOnline,
      lastActive: user.lastActive,
      gamingProfiles: user.gamingProfiles,
      interests: user.interests,
      jobTitle: user.jobTitle,
      school: user.school,
      isVerified: user.isVerified,
    })),
    participantsKey: match.participantsKey,
    status: match.status,
    matchedAt: match.matchedAt,
    lastMessage: match.lastMessage,
    source: match.source || "dating",
    gamerContext: match.gamerContext,
    unreadCount: match.unreadCount || 0,
  };
}

function buildGamerMatchContext(recruitment, teamMatchId) {
  return {
    recruitment: recruitment._id,
    teamMatch: teamMatchId,
    gameName: recruitment.gameName,
    currentRank: recruitment.currentRank,
    lobbyGroup: recruitment.lobbyGroup,
    teamSize: recruitment.teamSize,
    playMode: recruitment.playMode,
    lobbyCode: recruitment.lobbyCode || "",
    teamName: recruitment.teamName || "",
    description: recruitment.description || recruitment.note || "",
  };
}

async function upsertTeamChat(recruitment, memberIds = [], teamMatchId) {
  const participantsKey = `team:${recruitment._id.toString()}`;
  const users = [...new Set(
    [recruitment.owner?._id || recruitment.owner, ...(recruitment.members || []), ...memberIds]
      .filter(Boolean)
      .map((member) => member._id?.toString?.() || member.toString()),
  )];
  const gamerContext = buildGamerMatchContext(recruitment, teamMatchId);
  let teamChat = await Match.findOne({
    $or: [
      { participantsKey },
      { "gamerContext.recruitment": recruitment._id, source: "gamer_lobby" },
    ],
    status: "active",
  });

  if (teamChat) {
    teamChat.users = [...new Set([
      ...teamChat.users.map((userId) => userId.toString()),
      ...users,
    ])];
    teamChat.participantsKey = participantsKey;
    teamChat.source = "gamer_lobby";
    teamChat.gamerContext = {
      ...(teamChat.gamerContext?.toObject?.() || teamChat.gamerContext || {}),
      ...gamerContext,
    };
    await teamChat.save();
    return teamChat.populate("users", GAMER_USER_SELECT);
  }

  try {
    teamChat = await Match.create({
      users,
      participantsKey,
      source: "gamer_lobby",
      gamerContext,
      matchedAt: new Date(),
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    teamChat = await Match.findOneAndUpdate(
      { participantsKey },
      {
        $set: { status: "active", unmatchedBy: null, source: "gamer_lobby", gamerContext },
        $addToSet: { users: { $each: users } },
      },
      { returnDocument: "after" },
    );
  }

  return teamChat.populate("users", GAMER_USER_SELECT);
}

function mapGamerLobbyOwner(owner = {}) {
  return {
    id: owner._id?.toString(),
    _id: owner._id?.toString(),
    name: owner.name,
    age: owner.age,
    avatarUrl: owner.avatarUrl,
    photos: owner.photos,
    isOnline: owner.isOnline,
    lastActive: owner.lastActive,
    gamingProfiles: owner.gamingProfiles,
  };
}

async function exploreGamerLobby({ requesterId, game, lobbyGroup, limit }) {
  const normalizedLimit = normalizeLimit(limit);
  const filters = { game, lobbyGroup };

  const users = await User.find({
    _id: { $ne: requesterId },
    gamingProfiles: {
      $elemMatch: {
        gameName: game,
        lobbyGroup,
      },
    },
  })
    .select(
      "name birthDate gender bio interests avatarUrl photos isOnline lastActive gamingProfiles",
    )
    .sort({ isOnline: -1, lastActive: -1, updatedAt: -1 })
    .limit(normalizedLimit);

  return users.map((user) => mapGamerLobbyUser(user, filters));
}

async function createRecruitment({ ownerId, payload }) {
  const { values } = validateRecruitmentPayload(payload);

  const post = await GamerRecruitment.create({
    owner: ownerId,
    members: [ownerId],
    memberCount: 1,
    ...values,
  });

  await upsertTeamChat(post, [ownerId]);

  const populatedPost = await post.populate(
    "owner",
    GAMER_USER_SELECT,
  );

  return mapRecruitmentPost(populatedPost);
}

async function listRecruitments({ requesterId, game, lobbyGroup, limit }) {
  const normalizedLimit = normalizeLimit(limit);

  const posts = await GamerRecruitment.find({
    gameName: game,
    lobbyGroup,
    status: "open",
    members: { $ne: requesterId },
  })
    .populate("owner", GAMER_USER_SELECT)
    .sort({ createdAt: -1 })
    .limit(normalizedLimit);

  return posts.map(mapRecruitmentPost);
}

async function closeRecruitment({ ownerId, recruitmentId }) {
  if (!recruitmentId || !/^[a-f\d]{24}$/i.test(String(recruitmentId))) {
    throw httpError(400, "Invalid recruitment id.");
  }

  const existingRecruitment = await GamerRecruitment.findOne({
    _id: recruitmentId,
    owner: ownerId,
  });

  if (!existingRecruitment) {
    throw httpError(404, "Recruitment post not found.");
  }

  if (existingRecruitment.status === "closed") {
    await existingRecruitment.populate("owner", GAMER_USER_SELECT);
    return {
      recruitment: mapRecruitmentPost(existingRecruitment),
      dissolvedUserIds: [],
      wasClosed: false,
    };
  }

  const recruitment = await GamerRecruitment.findOneAndUpdate(
    {
      _id: recruitmentId,
      owner: ownerId,
      status: "open",
    },
    {
      $set: {
        status: "closed",
      },
    },
    { returnDocument: "after" },
  ).populate("owner", GAMER_USER_SELECT);

  if (!recruitment) {
    throw httpError(404, "Recruitment post not found.");
  }

  const activeTeamMatches = await GamerTeamMatch.find({
    recruitment: recruitment._id,
    status: "active",
  }).select("joiner").lean();
  const dissolvedUserIds = [
    ...(recruitment.members || []),
    ...activeTeamMatches.map((teamMatch) => teamMatch.joiner),
  ]
    .map((member) => member._id?.toString?.() || member.toString())
    .filter((memberId, index, allMemberIds) =>
      memberId !== ownerId.toString() && allMemberIds.indexOf(memberId) === index,
    );

  await GamerTeamMatch.updateMany(
    {
      recruitment: recruitment._id,
      status: "active",
    },
    {
      $set: {
        status: "closed",
      },
    },
  );
  await Match.updateMany(
    { "gamerContext.recruitment": recruitment._id, source: "gamer_lobby", status: "active" },
    { $set: { status: "unmatched", unmatchedBy: ownerId } },
  );

  return {
    recruitment: mapRecruitmentPost(recruitment),
    dissolvedUserIds,
    wasClosed: true,
  };
}

async function leaveRecruitment({ userId, recruitmentId }) {
  if (!recruitmentId || !/^[a-f\d]{24}$/i.test(String(recruitmentId))) {
    throw httpError(400, "Invalid recruitment id.");
  }

  const recruitment = await GamerRecruitment.findById(recruitmentId);
  if (!recruitment) throw httpError(404, "Team not found.");

  if (recruitment.owner.toString() === userId.toString()) {
    const closed = await closeRecruitment({ ownerId: userId, recruitmentId });
    const dissolvedUserIds = (recruitment.members || [])
      .map((memberId) => memberId.toString())
      .filter((memberId) => memberId !== userId.toString());
    await GamerTeamMatch.updateMany(
      { recruitment: recruitmentId, status: "active" },
      { $set: { status: "closed" } },
    );
    await Match.updateMany(
      { "gamerContext.recruitment": recruitmentId, source: "gamer_lobby", status: "active" },
      { $set: { status: "unmatched", unmatchedBy: userId } },
    );
    return {
      ...closed,
      dissolvedUserIds: [...new Set([...(closed.dissolvedUserIds || []), ...dissolvedUserIds])],
      leftUserId: userId.toString(),
      dissolved: true,
      chatMatch: null,
    };
  }

  const isMember = (recruitment.members || []).some(
    (memberId) => memberId.toString() === userId.toString(),
  );
  if (!isMember) throw httpError(404, "You are no longer a member of this team.");

  const updatedRecruitment = await GamerRecruitment.findOneAndUpdate(
    { _id: recruitmentId, members: userId },
    {
      $pull: { members: userId },
      $inc: { memberCount: -1 },
      $set: { status: "open" },
    },
    { returnDocument: "after" },
  ).populate("owner", GAMER_USER_SELECT);

  await GamerTeamMatch.updateMany(
    { recruitment: recruitmentId, joiner: userId, status: "active" },
    { $set: { status: "closed" } },
  );
  const teamChat = await Match.findOneAndUpdate(
    { "gamerContext.recruitment": recruitmentId, source: "gamer_lobby", status: "active" },
    { $pull: { users: userId, unreadCounts: { user: userId } } },
    { returnDocument: "after" },
  ).populate("users", GAMER_USER_SELECT);

  return {
    recruitment: mapRecruitmentPost(updatedRecruitment),
    dissolvedUserIds: [],
    wasClosed: false,
    dissolved: false,
    leftUserId: userId.toString(),
    chatMatch: mapChatMatch(teamChat),
  };
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

async function getPopulatedTeamMatch(matchId) {
  return GamerTeamMatch.findById(matchId)
    .populate("owner", GAMER_USER_SELECT)
    .populate("joiner", GAMER_USER_SELECT);
}

async function joinRecruitment({ joinerId, recruitmentId }) {
  if (!recruitmentId || !/^[a-f\d]{24}$/i.test(String(recruitmentId))) {
    throw httpError(400, "Invalid recruitment id.");
  }

  const recruitment = await GamerRecruitment.findOne({
    _id: recruitmentId,
  }).populate("owner", GAMER_USER_SELECT);

  if (!recruitment) {
    throw httpError(404, "Recruitment post not found.");
  }

  if (recruitment.owner._id.toString() === joinerId.toString()) {
    throw httpError(400, "You cannot join your own recruitment post.");
  }

  const existingMatch = await GamerTeamMatch.findOne({
    recruitment: recruitment._id,
    joiner: joinerId,
    status: "active",
  })
    .populate("owner", GAMER_USER_SELECT)
    .populate("joiner", GAMER_USER_SELECT);

  if (existingMatch) {
    const chatMatch = await upsertTeamChat(recruitment, [joinerId], existingMatch._id);

    return {
      isTeamFound: true,
      message: "Teammate found",
      recruitment: mapRecruitmentPost(recruitment),
      teamMatch: mapGamerTeamMatch(existingMatch),
      chatMatch: mapChatMatch(chatMatch),
    };
  }

  if (recruitment.status !== "open") {
    throw httpError(404, "Recruitment post is no longer open.");
  }

  try {
    if (!recruitment.members?.length || !recruitment.memberCount) {
      await GamerRecruitment.updateOne(
        { _id: recruitment._id },
        {
          $set: {
            members: [recruitment.owner._id],
            memberCount: 1,
          },
        },
      );
    }

    const reservedRecruitment = await GamerRecruitment.findOneAndUpdate(
      {
        _id: recruitment._id,
        status: "open",
        members: { $ne: joinerId },
        $expr: {
          $lt: [{ $ifNull: ["$memberCount", 1] }, "$teamSize"],
        },
      },
      {
        $addToSet: { members: joinerId },
        $inc: { memberCount: 1 },
      },
      { returnDocument: "after" },
    ).populate("owner", GAMER_USER_SELECT);

    if (!reservedRecruitment) {
      throw httpError(404, "Recruitment post is no longer open.");
    }

    const createdMatch = await GamerTeamMatch.create({
      recruitment: reservedRecruitment._id,
      owner: reservedRecruitment.owner._id,
      joiner: joinerId,
      gameName: reservedRecruitment.gameName,
      currentRank: reservedRecruitment.currentRank,
      lobbyGroup: reservedRecruitment.lobbyGroup,
      teamSize: reservedRecruitment.teamSize,
      playMode: reservedRecruitment.playMode,
      lobbyCode: reservedRecruitment.lobbyCode || "",
      teamName: reservedRecruitment.teamName || "",
      description: reservedRecruitment.description || reservedRecruitment.note || "",
      matchedAt: new Date(),
    });

    const populatedMatch = await getPopulatedTeamMatch(createdMatch._id);
    const chatMatch = await upsertTeamChat(reservedRecruitment, [joinerId], createdMatch._id);

    if (reservedRecruitment.memberCount >= reservedRecruitment.teamSize) {
      await GamerRecruitment.updateOne(
        { _id: reservedRecruitment._id },
        { $set: { status: "closed" } },
      );
      reservedRecruitment.status = "closed";
    }

    return {
      isTeamFound: true,
      message: "Teammate found",
      recruitment: mapRecruitmentPost(reservedRecruitment),
      teamMatch: mapGamerTeamMatch(populatedMatch),
      chatMatch: mapChatMatch(chatMatch),
    };
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const match = await GamerTeamMatch.findOne({
      recruitment: recruitment._id,
      joiner: joinerId,
      status: "active",
    })
      .populate("owner", GAMER_USER_SELECT)
      .populate("joiner", GAMER_USER_SELECT);
    const chatMatch = await upsertTeamChat(recruitment, [joinerId], match?._id);

    return {
      isTeamFound: true,
      message: "Teammate found",
      recruitment: mapRecruitmentPost(recruitment),
      teamMatch: mapGamerTeamMatch(match),
      chatMatch: mapChatMatch(chatMatch),
    };
  }
}

module.exports = {
  closeRecruitment,
  createRecruitment,
  exploreGamerLobby,
  joinRecruitment,
  leaveRecruitment,
  listRecruitments,
  mapGamerTeamMatch,
  normalizeLimit,
  normalizeLobbyGroup,
  validateRecruitmentPayload,
  validateGamerLobbyQuery,
};
