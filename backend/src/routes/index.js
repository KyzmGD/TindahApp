const express = require("express");
const authRoutes = require("./auth.routes");
const swipeRoutes = require("./swipe.routes");
const matchRoutes = require("./match.routes");
const chatRoutes = require("./chat.routes");
const uploadRoutes = require("./upload.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/v1/auth", authRoutes);
router.use("/swipes", swipeRoutes);
router.use("/matches", matchRoutes);
router.use("/chats", chatRoutes);
router.use("/upload", uploadRoutes);
router.use("/v1/upload", uploadRoutes);

module.exports = router;
