const User = require("../src/models/User");

function buildUser(overrides = {}) {
  return new User({
    name: "Push Token User",
    email: `push-token-${Date.now()}-${Math.random()}@example.com`,
    passwordHash: "hashed-password",
    birthDate: new Date("1995-05-20T00:00:00.000Z"),
    gender: "woman",
    ...overrides,
  });
}

describe("User model push tokens", () => {
  it("stores push token metadata without exposing tokens in profile JSON", async () => {
    const user = buildUser({
      pushTokens: [
        {
          token: "ExponentPushToken[test-token]",
          provider: "expo",
          platform: "android",
          deviceId: "pixel-local",
        },
      ],
    });

    await expect(user.validate()).resolves.toBeUndefined();
    expect(user.pushTokens[0]).toMatchObject({
      token: "ExponentPushToken[test-token]",
      provider: "expo",
      platform: "android",
      deviceId: "pixel-local",
      disabled: false,
    });
    expect(user.toProfileJSON().pushTokens).toBeUndefined();
  });

  it("rejects duplicate active push tokens for the same user", async () => {
    const user = buildUser({
      pushTokens: [
        { token: "ExponentPushToken[duplicate]", provider: "expo" },
        { token: "ExponentPushToken[duplicate]", provider: "expo" },
      ],
    });

    await expect(user.validate()).rejects.toThrow("Push tokens must be unique per user.");
  });

  it("allows a revoked token record to coexist with a fresh active token", async () => {
    const user = buildUser({
      pushTokens: [
        {
          token: "ExponentPushToken[reissued]",
          provider: "expo",
          disabled: true,
          revokedAt: new Date(),
        },
        { token: "ExponentPushToken[reissued]", provider: "expo" },
      ],
    });

    await expect(user.validate()).resolves.toBeUndefined();
  });
});
