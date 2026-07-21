const express = require("express");
const chatController = require("../controllers/chat.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/:matchId", authMiddleware, chatController.getMessageHistory);

module.exports = router;
