const mongoose = require("mongoose");
const Match = require("../models/Match");
const Message = require("../models/Message");
const httpError = require("../utils/httpError");

async function assertUserInActiveMatch(matchId, userId) {
  if (!mongoose.Types.ObjectId.isValid(matchId)) {
    throw httpError(400, "Invalid match id");
  }

  const match = await Match.findOne({ _id: matchId, users: userId, status: "active" });

  if (!match) {
    throw httpError(404, "Match not found");
  }

  return match;
}

function normalizeMessagePagination(options = {}) {
  const defaultLimit = Number(options.defaultLimit) || 20;
  const parsedPage = Number(options.page);
  const parsedLimit = Number(options.limit);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, 100)
    : defaultLimit;

  return { page, limit };
}

async function listMessages(matchId, userId, options = {}) {
  await assertUserInActiveMatch(matchId, userId);
  const { page, limit } = normalizeMessagePagination(options);
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ match: matchId })
      .populate("sender", "name photos")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Message.countDocuments({ match: matchId }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    messages,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

async function sendMessage({ matchId, senderId, text, imageUrl }) {
  const trimmedText = typeof text === "string" ? text.trim() : "";
  const trimmedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";

  if (!trimmedText && !trimmedImageUrl) {
    throw httpError(400, "Message text or image is required");
  }

  const match = await assertUserInActiveMatch(matchId, senderId);
  const receiverId = match.users.find(
    (userId) => userId.toString() !== senderId.toString(),
  );
  const message = await Message.create({
    match: matchId,
    sender: senderId,
    receiver: receiverId,
    text: trimmedText,
    imageUrl: trimmedImageUrl,
    readBy: [senderId],
  });

  match.lastMessage = {
    text: trimmedText || "Photo",
    sender: senderId,
    sentAt: message.createdAt,
  };
  await match.save();

  return message.populate("sender", "name photos");
}

module.exports = {
  listMessages,
  sendMessage,
  assertUserInActiveMatch,
  normalizeMessagePagination,
};
