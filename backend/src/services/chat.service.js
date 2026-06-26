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

async function listMessages(matchId, userId, limit = 50) {
  await assertUserInActiveMatch(matchId, userId);
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  return Message.find({ match: matchId })
    .populate("sender", "name photos")
    .sort({ createdAt: -1 })
    .limit(safeLimit);
}

async function sendMessage({ matchId, senderId, text, imageUrl }) {
  const trimmedText = typeof text === "string" ? text.trim() : "";
  const trimmedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";

  if (!trimmedText && !trimmedImageUrl) {
    throw httpError(400, "Message text or image is required");
  }

  const match = await assertUserInActiveMatch(matchId, senderId);
  const message = await Message.create({
    match: matchId,
    sender: senderId,
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
};
