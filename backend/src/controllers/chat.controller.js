const { listMessages, sendMessage } = require("../services/chat.service");
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
  });

  req.app.get("io")?.to(req.params.matchId).emit("message:new", message);
  req.app.get("io")?.to(req.params.matchId).emit("receive_message", message);
  res.status(201).json({ message });
});

module.exports = {
  getMessages,
  getMessageHistory,
  createMessage,
};
