const express = require("express");
const authRoutes = require("./auth.routes");
const swipeRoutes = require("./swipe.routes");
const matchRoutes = require("./match.routes");
const chatRoutes = require("./chat.routes");
const messageRoutes = require("./message.routes");
const uploadRoutes = require("./upload.routes");
const userRoutes = require("./user.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/v1/auth", authRoutes);
router.use("/swipes", swipeRoutes);
router.use("/v1/swipes", swipeRoutes);
router.use("/matches", matchRoutes);
router.use("/chats", chatRoutes);
router.use("/v1/messages", messageRoutes);
router.use("/upload", uploadRoutes);
router.use("/v1/upload", uploadRoutes);
router.use("/users", userRoutes);
router.use("/v1/users", userRoutes);

module.exports = router;
