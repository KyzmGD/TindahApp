const { listMessages, sendMessage } = require("../services/chat.service");
const { sendOfflineMessagePush } = require("../services/messageNotification.service");
const asyncHandler = require("../utils/asyncHandler");

const getMessages = asyncHandler(async (req, res) => {
  const result = await listMessages(req.params.matchId, req.user._id, {
    page: 1,
    limit: req.query.limit,
    defaultLimit: 50,
  });

  res.json({ messages: result.messages.reverse() });
});

const getMessageHistory = asyncHandler(async (req, res) => {
  const result = await listMessages(req.params.matchId, req.user._id, {
    page: req.query.page,
    limit: req.query.limit,
    defaultLimit: 20,
  });

  res.json(result);
});

const createMessage = asyncHandler(async (req, res) => {
  const message = await sendMessage({
    matchId: req.params.matchId,
    senderId: req.user._id,
    text: req.body.text,
    imageUrl: req.body.imageUrl,
    clientMessageId: req.body.clientMessageId,
  });

  req.app.get("io")?.to(req.params.matchId).emit("message:new", message);
  req.app.get("io")?.to(req.params.matchId).emit("receive_message", message);
  const receiverIds = message.receivers?.length ? message.receivers : [message.receiver].filter(Boolean);
  receiverIds.forEach((receiverId) => {
    req.app.get("io")?.to(`user:${receiverId.toString()}`).emit("message:notification", message);
  });
  if (message.$locals?.wasCreated) {
    await Promise.all(receiverIds.map((receiverId) => sendOfflineMessagePush({
      io: req.app.get("io"),
      message,
      receiverId,
    })));
  }
  res.status(201).json({ message });
});

module.exports = {
  getMessages,
  getMessageHistory,
  createMessage,
};
