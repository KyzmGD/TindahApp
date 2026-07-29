const User = require("../models/User");
const { sendExpoPushNotifications } = require("./notification.service");

function getIdString(value) {
  if (!value) {
    return "";
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
}

function getSocketById(io, socketId) {
  const sockets = io?.sockets?.sockets;

  if (!sockets) {
    return null;
  }

  if (typeof sockets.get === "function") {
    return sockets.get(socketId) || null;
  }

  return sockets[socketId] || null;
}

function isUserInRoom(io, userId, roomId) {
  const normalizedUserId = getIdString(userId);
  const normalizedRoomId = getIdString(roomId);
  const room = io?.sockets?.adapter?.rooms?.get(normalizedRoomId);

  if (!normalizedUserId || !room) {
    return false;
  }

  for (const socketId of room) {
    const socket = getSocketById(io, socketId);
    const socketUserId = getIdString(socket?.user?._id || socket?.user?.id);

    if (socketUserId === normalizedUserId) {
      return true;
    }
  }

  return false;
}

function getSenderName(message) {
  const sender = message?.sender;

  if (sender && typeof sender === "object" && sender.name) {
    return sender.name;
  }

  return "Someone";
}

function getMessagePreview(message) {
  const text = typeof message?.text === "string" ? message.text.trim() : "";

  if (text) {
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }

  if (message?.imageUrl) {
    return "Sent you a photo.";
  }

  return "Sent you a message.";
}

async function sendOfflineMessagePush({ io, message }) {
  try {
    const receiverId = getIdString(message?.receiver);
    const matchId = getIdString(message?.match);

    if (!receiverId || !matchId || !message?._id) {
      return { skipped: true, reason: "missing-message-routing-data" };
    }

    if (isUserInRoom(io, receiverId, matchId)) {
      return { skipped: true, reason: "receiver-in-chat-room" };
    }

    const recipient = await User.findById(receiverId).select("pushTokens").lean();

    if (!recipient) {
      return { skipped: true, reason: "receiver-not-found" };
    }

    return await sendExpoPushNotifications(recipient, {
      title: getSenderName(message),
      body: getMessagePreview(message),
      data: {
        type: "message",
        matchId,
        messageId: getIdString(message._id),
        senderId: getIdString(message.sender),
      },
      channelId: "messages",
      priority: "high",
    });
  } catch (error) {
    console.error("Message push notification failed:", error.message);
    return { skipped: true, reason: "message-push-failed", error: error.message };
  }
}

module.exports = {
  getMessagePreview,
  isUserInRoom,
  sendOfflineMessagePush,
};
