const {
  buildExpoPushMessages,
  getActiveExpoPushTokens,
  isExpoPushToken,
  resetExpoClientForTesting,
  sendExpoPushNotifications,
  setExpoClientForTesting,
} = require("../src/services/notification.service");

const TOKEN_A = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";
const TOKEN_B = "ExpoPushToken[bbbbbbbbbbbbbbbbbbbbbb]";
const TOKEN_C = "ExponentPushToken[cccccccccccccccccccccc]";

describe("notification service", () => {
  afterEach(() => {
    resetExpoClientForTesting();
    jest.restoreAllMocks();
  });

  it("detects valid Expo push tokens", () => {
    expect(isExpoPushToken(TOKEN_A)).toBe(true);
    expect(isExpoPushToken(TOKEN_B)).toBe(true);
    expect(isExpoPushToken("not-a-token")).toBe(false);
    expect(isExpoPushToken("ExponentPushToken[]")).toBe(false);
  });

  it("extracts unique active Expo push tokens from users and token strings", () => {
    const tokens = getActiveExpoPushTokens([
      TOKEN_A,
      {
        pushTokens: [
          { token: TOKEN_A, provider: "expo" },
          { token: TOKEN_B, provider: "expo", platform: "ios" },
          { token: TOKEN_C, provider: "expo", disabled: true },
          { token: "web-token", provider: "web" },
          { token: "not-a-token", provider: "expo" },
          { token: "ExponentPushToken[revoked]", provider: "expo", revokedAt: new Date() },
        ],
      },
    ]);

    expect(tokens).toEqual([TOKEN_A, TOKEN_B]);
  });

  it("builds Expo push messages without leaking duplicate tokens", () => {
    const messages = buildExpoPushMessages([TOKEN_A, TOKEN_A, TOKEN_B], {
      title: "It's a match!",
      body: "You and Alice liked each other.",
      data: {
        type: "match",
        matchId: "match-123",
      },
      channelId: "matches",
      priority: "high",
    });

    expect(messages).toEqual([
      {
        to: TOKEN_A,
        sound: "default",
        title: "It's a match!",
        body: "You and Alice liked each other.",
        data: {
          type: "match",
          matchId: "match-123",
        },
        channelId: "matches",
        priority: "high",
      },
      {
        to: TOKEN_B,
        sound: "default",
        title: "It's a match!",
        body: "You and Alice liked each other.",
        data: {
          type: "match",
          matchId: "match-123",
        },
        channelId: "matches",
        priority: "high",
      },
    ]);
  });

  it("sends Expo push notifications in chunks and reports ticket errors", async () => {
    const expoClient = {
      chunkPushNotifications: jest.fn((messages) => [
        messages.slice(0, 2),
        messages.slice(2),
      ]),
      sendPushNotificationsAsync: jest.fn()
        .mockResolvedValueOnce([
          { status: "ok", id: "ticket-1" },
          {
            status: "error",
            message: "Device not registered",
            details: { error: "DeviceNotRegistered" },
          },
        ])
        .mockResolvedValueOnce([{ status: "ok", id: "ticket-3" }]),
    };
    setExpoClientForTesting(expoClient);

    const result = await sendExpoPushNotifications(
      [
        {
          pushTokens: [
            { token: TOKEN_A, provider: "expo" },
            { token: TOKEN_B, provider: "expo" },
            { token: TOKEN_C, provider: "expo" },
          ],
        },
      ],
      {
        title: "New message",
        body: "Alice sent you a message.",
        data: { type: "message" },
      },
    );

    expect(expoClient.chunkPushNotifications).toHaveBeenCalledTimes(1);
    expect(expoClient.sendPushNotificationsAsync).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      requested: 3,
      sent: 2,
    });
    expect(result.tickets).toHaveLength(3);
    expect(result.errors).toEqual([
      {
        message: "Device not registered",
        details: { error: "DeviceNotRegistered" },
      },
    ]);
  });

  it("logs send failures and returns a failure summary instead of throwing", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const expoClient = {
      chunkPushNotifications: jest.fn((messages) => [messages]),
      sendPushNotificationsAsync: jest.fn().mockRejectedValue(new Error("network down")),
    };
    setExpoClientForTesting(expoClient);

    const result = await sendExpoPushNotifications(TOKEN_A, {
      title: "It's a match!",
      body: "Open Tindah to say hi.",
    });

    expect(result).toMatchObject({
      requested: 1,
      sent: 0,
      errors: [{ message: "network down" }],
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Push notification send failed:",
      "network down",
    );
  });
});
