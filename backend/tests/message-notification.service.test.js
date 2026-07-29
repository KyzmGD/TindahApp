const mongoose = require("mongoose");
const User = require("../src/models/User");
const {
  isUserInRoom,
  sendOfflineMessagePush,
} = require("../src/services/messageNotification.service");
const {
  resetExpoClientForTesting,
  setExpoClientForTesting,
} = require("../src/services/notification.service");

const VALID_EXPO_PUSH_TOKEN = "ExponentPushToken[messagepushaaaaaaaaaaa]";

function makeFakeIo({ roomId, socketId, userId }) {
  return {
    sockets: {
      adapter: {
        rooms: new Map([[roomId, new Set([socketId])]]),
      },
      sockets: new Map([
        [
          socketId,
          {
            user: { _id: userId },
          },
        ],
      ]),
    },
  };
}

describe("message notification service", () => {
  afterEach(() => {
    resetExpoClientForTesting();
  });

  it("detects whether a specific user is inside a socket room", () => {
    const userId = new mongoose.Types.ObjectId();
    const otherUserId = new mongoose.Types.ObjectId();
    const roomId = new mongoose.Types.ObjectId().toString();
    const io = makeFakeIo({ roomId, socketId: "socket-1", userId });

    expect(isUserInRoom(io, userId, roomId)).toBe(true);
    expect(isUserInRoom(io, otherUserId, roomId)).toBe(false);
    expect(isUserInRoom(io, userId, "missing-room")).toBe(false);
  });

  it("skips message push when the receiver is already in the chat room", async () => {
    const recipient = await User.create({
      name: "Receiver Online",
      email: "receiver-online@example.com",
      passwordHash: "hashed-password",
      birthDate: new Date("1998-01-01"),
      gender: "woman",
      pushTokens: [
        {
          token: VALID_EXPO_PUSH_TOKEN,
          provider: "expo",
          platform: "ios",
          deviceId: "receiver-online-device",
        },
      ],
    });
    const senderId = new mongoose.Types.ObjectId();
    const matchId = new mongoose.Types.ObjectId().toString();
    const io = makeFakeIo({ roomId: matchId, socketId: "socket-1", userId: recipient._id });
    const fakeExpoClient = {
      chunkPushNotifications: jest.fn((messages) => [messages]),
      sendPushNotificationsAsync: jest.fn(async (messages) => (
        messages.map(() => ({ status: "ok" }))
      )),
    };
    setExpoClientForTesting(fakeExpoClient);

    const result = await sendOfflineMessagePush({
      io,
      message: {
        _id: new mongoose.Types.ObjectId(),
        match: matchId,
        sender: { _id: senderId, name: "Sender Offline" },
        receiver: recipient._id,
        text: "You should already see this live.",
      },
    });

    expect(result).toEqual({ skipped: true, reason: "receiver-in-chat-room" });
    expect(fakeExpoClient.sendPushNotificationsAsync).not.toHaveBeenCalled();
  });
});
