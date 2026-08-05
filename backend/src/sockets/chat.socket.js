const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  assertUserInActiveMatch,
  markMessagesRead,
  sendMessage,
} = require("../services/chat.service");
const { sendOfflineMessagePush } = require("../services/messageNotification.service");
const {
  emitPresenceToActiveMatchRooms,
  getPresenceSnapshot,
  markUserOfflineIfNoSockets,
  markUserOnline,
} = require("../services/presence.service");
const { emitLiveLobbyStats } = require("../services/liveLobbyStats.service");

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

    socket.on("presence:subscribe", async (payload = {}, callback) => {
      try {
        const requestedMatchIds = Array.isArray(payload.matchIds)
          ? [...new Set(payload.matchIds.filter(Boolean).map(String))].slice(0, 100)
          : [];
        const currentRooms = socket.data.presenceRooms || new Set();
        const nextRooms = new Set();

        for (const matchId of requestedMatchIds) {
          const match = await assertUserInActiveMatch(matchId, socket.user._id);
          const roomName = `presence:${matchId}`;
          nextRooms.add(roomName);
          socket.join(roomName);
          const users = await getPresenceSnapshot(match.users);
          socket.emit("presence:snapshot", { matchId, users });
        }

        currentRooms.forEach((roomName) => {
          if (!nextRooms.has(roomName)) socket.leave(roomName);
        });
        socket.data.presenceRooms = nextRooms;
        callback?.({ ok: true, matchIds: requestedMatchIds });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("match:join", async (matchId, callback) => {
      try {
        const match = await assertUserInActiveMatch(matchId, socket.user._id);
        socket.join(matchId);
        const users = await getPresenceSnapshot(match.users);
        socket.emit("presence:snapshot", { matchId, users });
        callback?.({ ok: true, presence: users });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("send_message", async (payload = {}, callback) => {
      try {
        const message = await sendMessage({
          matchId: payload.matchId,
          senderId: socket.user._id,
          text: payload.text,
          imageUrl: payload.imageUrl,
          clientMessageId: payload.clientMessageId,
        });

        socket.join(payload.matchId);
        io.to(payload.matchId).emit("receive_message", message);
        const receiverIds = message.receivers?.length ? message.receivers : [message.receiver].filter(Boolean);
        receiverIds.forEach((receiverId) => {
          io.to(`user:${receiverId.toString()}`).emit("message:notification", message);
        });
        if (message.$locals?.wasCreated) {
          await Promise.all(receiverIds.map((receiverId) => sendOfflineMessagePush({ io, message, receiverId })));
        }
        callback?.({ ok: true, message });
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

    socket.on("read_message", async (payload = {}, callback) => {
      try {
        const messageIds = await markMessagesRead({
          matchId: payload.matchId,
          userId: socket.user._id,
          messageIds: payload.messageIds,
        });
        const event = {
          matchId: payload.matchId,
          userId: socket.user._id.toString(),
          messageIds,
          readAt: new Date().toISOString(),
        };

        io.to(payload.matchId).emit("read_message", event);
        callback?.({ ok: true, ...event });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("disconnect", async () => {
      try {
        const presence = await markUserOfflineIfNoSockets(socket.user._id);

        if (presence) {
          await emitPresenceToActiveMatchRooms(io, presence);
          await emitLiveLobbyStats(io);
        }
      } catch (error) {
        console.warn("Presence offline update failed:", error.message);
      }
    });

    markUserOnline(socket.user._id)
      .then(async (presence) => {
        await emitPresenceToActiveMatchRooms(io, presence);
        await emitLiveLobbyStats(io);
      })
      .catch((error) => {
        console.warn("Presence online update failed:", error.message);
      });
  });

  app?.set("io", io);

  return io;
}

module.exports = registerChatSocket;
