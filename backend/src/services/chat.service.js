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
      .populate("sender", "name avatarUrl avatarPublicId photos")
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

function getUnreadCount(match, userId) {
  const userIdString = userId.toString();
  const unreadEntry = (match.unreadCounts || []).find(
    (entry) => entry.user?.toString() === userIdString,
  );

  return unreadEntry?.count || 0;
}

function incrementUnreadCount(match, userId) {
  const userIdString = userId.toString();
  const unreadEntry = (match.unreadCounts || []).find(
    (entry) => entry.user?.toString() === userIdString,
  );

  if (unreadEntry) {
    unreadEntry.count = Math.max(0, unreadEntry.count || 0) + 1;
    return;
  }

  match.unreadCounts.push({
    user: userId,
    count: 1,
  });
}

async function resetUnreadCount(matchId, userId) {
  const match = await Match.findById(matchId);

  if (!match) {
    return;
  }

  const unreadEntry = (match.unreadCounts || []).find(
    (entry) => entry.user?.toString() === userId.toString(),
  );

  if (unreadEntry) {
    unreadEntry.count = 0;
    await match.save();
  }
}

async function sendMessage({ matchId, senderId, text, imageUrl, clientMessageId }) {
  const trimmedText = typeof text === "string" ? text.trim() : "";
  const trimmedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const normalizedClientMessageId = typeof clientMessageId === "string"
    ? clientMessageId.trim().slice(0, 120)
    : "";

  if (!trimmedText && !trimmedImageUrl) {
    throw httpError(400, "Message text or image is required");
  }

  const match = await assertUserInActiveMatch(matchId, senderId);

  if (normalizedClientMessageId) {
    const existingMessage = await Message.findOne({
      sender: senderId,
      clientMessageId: normalizedClientMessageId,
    }).populate("sender", "name avatarUrl avatarPublicId photos");

    if (existingMessage) {
      existingMessage.$locals.wasCreated = false;
      return existingMessage;
    }
  }

  const receiverId = match.users.find(
    (userId) => userId.toString() !== senderId.toString(),
  );
  let message;

  try {
    message = await Message.create({
      match: matchId,
      sender: senderId,
      receiver: receiverId,
      clientMessageId: normalizedClientMessageId || undefined,
      text: trimmedText,
      imageUrl: trimmedImageUrl,
      readBy: [senderId],
    });
  } catch (error) {
    if (error.code !== 11000 || !normalizedClientMessageId) {
      throw error;
    }

    const existingMessage = await Message.findOne({
      sender: senderId,
      clientMessageId: normalizedClientMessageId,
    }).populate("sender", "name avatarUrl avatarPublicId photos");

    if (existingMessage) {
      existingMessage.$locals.wasCreated = false;
      return existingMessage;
    }

    throw error;
  }

  match.lastMessage = {
    text: trimmedText || "Photo",
    sender: senderId,
    sentAt: message.createdAt,
  };
  if (receiverId) {
    incrementUnreadCount(match, receiverId);
  }
  await match.save();

  message.$locals.wasCreated = true;
  return message.populate("sender", "name avatarUrl avatarPublicId photos");
}

async function markMessagesRead({ matchId, userId, messageIds = [] }) {
  await assertUserInActiveMatch(matchId, userId);

  const filter = {
    match: matchId,
    receiver: userId,
    readBy: { $ne: userId },
  };

  const normalizedMessageIds = Array.isArray(messageIds)
    ? messageIds.filter((messageId) => mongoose.Types.ObjectId.isValid(messageId))
    : [];

  if (normalizedMessageIds.length) {
    filter._id = { $in: normalizedMessageIds };
  }

  const messages = await Message.find(filter).select("_id").lean();

  if (!messages.length) {
    return [];
  }

  const readMessageIds = messages.map((message) => message._id.toString());
  await Message.updateMany(
    { _id: { $in: readMessageIds } },
    { $addToSet: { readBy: userId } },
  );
  await resetUnreadCount(matchId, userId);

  return readMessageIds;
}

module.exports = {
  listMessages,
  sendMessage,
  markMessagesRead,
  assertUserInActiveMatch,
  normalizeMessagePagination,
  getUnreadCount,
};
