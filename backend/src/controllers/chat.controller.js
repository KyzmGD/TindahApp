const { listMessages, sendMessage } = require("../services/chat.service");
const asyncHandler = require("../utils/asyncHandler");

const getMessages = asyncHandler(async (req, res) => {
  const messages = await listMessages(req.params.matchId, req.user._id, req.query.limit);
  res.json({ messages: messages.reverse() });
});

const createMessage = asyncHandler(async (req, res) => {
  const message = await sendMessage({
    matchId: req.params.matchId,
    senderId: req.user._id,
    text: req.body.text,
    imageUrl: req.body.imageUrl,
  });

  req.app.get("io")?.to(req.params.matchId).emit("message:new", message);
  res.status(201).json({ message });
});

module.exports = {
  getMessages,
  createMessage,
};
