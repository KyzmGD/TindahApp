const express = require("express");
const chatController = require("../controllers/chat.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const aiFilterMiddleware = require("../middlewares/ai_filter.middleware");

const router = express.Router();

router.get("/:matchId/messages", authMiddleware, chatController.getMessages);
router.post("/:matchId/messages", authMiddleware, aiFilterMiddleware, chatController.createMessage);

module.exports = router;
