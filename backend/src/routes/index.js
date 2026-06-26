const express = require("express");
const authRoutes = require("./auth.routes");
const swipeRoutes = require("./swipe.routes");
const matchRoutes = require("./match.routes");
const chatRoutes = require("./chat.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/swipes", swipeRoutes);
router.use("/matches", matchRoutes);
router.use("/chats", chatRoutes);

module.exports = router;
