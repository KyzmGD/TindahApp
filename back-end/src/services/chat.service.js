const Match = require("../models/Match");
const Message = require("../models/Message");
const httpError = require("../utils/httpError");

async function assertUserInActiveMatch(matchId, userId) {
  const match = await Match.findOne({ _id: matchId, users: userId, status: "active" });

  if (!match) {
    throw httpError(404, "Match not found");
  }

  return match;
}

async function listMessages(matchId, userId, limit = 50) {
  await assertUserInActiveMatch(matchId, userId);

  return Message.find({ match: matchId })
    .populate("sender", "name photos")
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 50);
}

async function sendMessage({ matchId, senderId, text, imageUrl }) {
  if (!text && !imageUrl) {
    throw httpError(400, "Message text or image is required");
  }

  const match = await assertUserInActiveMatch(matchId, senderId);
  const message = await Message.create({
    match: matchId,
    sender: senderId,
    text,
    imageUrl,
    readBy: [senderId],
  });

  match.lastMessage = {
    text: text || "Photo",
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
