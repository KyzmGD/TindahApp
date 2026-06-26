const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { assertUserInActiveMatch } = require("../services/chat.service");

function registerChatSocket(server, app) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication token is required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
      const user = await User.findById(decoded.sub);

      if (!user) {
        return next(new Error("User no longer exists"));
      }

      socket.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id}`);

    socket.on("match:join", async (matchId, callback) => {
      try {
        await assertUserInActiveMatch(matchId, socket.user._id);
        socket.join(matchId);
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("typing", async ({ matchId, isTyping }, callback) => {
      try {
        await assertUserInActiveMatch(matchId, socket.user._id);
        socket.to(matchId).emit("typing", {
          matchId,
          userId: socket.user._id.toString(),
          isTyping: Boolean(isTyping),
        });
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });
  });

  app?.set("io", io);

  return io;
}

module.exports = registerChatSocket;
