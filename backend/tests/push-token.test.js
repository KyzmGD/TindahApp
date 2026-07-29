const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const User = require("../src/models/User");

const VALID_EXPO_TOKEN = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";
const ROTATED_EXPO_TOKEN = "ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]";

function signUserToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
}

async function createUser(overrides = {}) {
  return User.create({
    name: "Push API User",
    email: `push-api-${Date.now()}-${Math.random()}@example.com`,
    passwordHash: "hashed-password",
    birthDate: new Date("1995-05-20T00:00:00.000Z"),
    gender: "woman",
    ...overrides,
  });
}

describe("push token API", () => {
  it("saves an Expo push token for the authenticated user", async () => {
    const user = await createUser();

    const response = await request(app)
      .post("/api/v1/users/push-token")
      .set("Authorization", `Bearer ${signUserToken(user)}`)
      .send({
        token: VALID_EXPO_TOKEN,
        provider: "expo",
        platform: "android",
        deviceId: "pixel-8-local",
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      message: "Push token saved successfully",
      pushToken: {
        provider: "expo",
        platform: "android",
        deviceId: "pixel-8-local",
      },
    });
    expect(response.body.pushToken.token).toBeUndefined();

    const storedUser = await User.findById(user._id).lean();
    expect(storedUser.pushTokens).toHaveLength(1);
    expect(storedUser.pushTokens[0]).toMatchObject({
      token: VALID_EXPO_TOKEN,
      provider: "expo",
      platform: "android",
      deviceId: "pixel-8-local",
      disabled: false,
    });
    expect(storedUser.pushTokens[0].lastSeenAt).toBeInstanceOf(Date);
  });

  it("updates an existing device token instead of creating duplicates", async () => {
    const user = await createUser({
      pushTokens: [
        {
          token: VALID_EXPO_TOKEN,
          provider: "expo",
          platform: "android",
          deviceId: "same-device",
        },
      ],
    });

    const response = await request(app)
      .post("/api/v1/users/push-token")
      .set("Authorization", `Bearer ${signUserToken(user)}`)
      .send({
        token: ROTATED_EXPO_TOKEN,
        provider: "expo",
        platform: "ios",
        deviceId: "same-device",
      });

    expect(response.status).toBe(201);

    const storedUser = await User.findById(user._id).lean();
    expect(storedUser.pushTokens).toHaveLength(1);
    expect(storedUser.pushTokens[0]).toMatchObject({
      token: ROTATED_EXPO_TOKEN,
      provider: "expo",
      platform: "ios",
      deviceId: "same-device",
      disabled: false,
    });
  });

  it("rejects invalid push token payloads before saving", async () => {
    const user = await createUser();

    const response = await request(app)
      .post("/api/v1/users/push-token")
      .set("Authorization", `Bearer ${signUserToken(user)}`)
      .send({
        token: "not-a-real-token",
        provider: "expo",
        platform: "desktop",
        deviceId: "x".repeat(161),
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Please fix the highlighted fields.");
    expect(response.body.details).toMatchObject({
      token: "Enter a valid Expo push token.",
      platform: "Select a valid push token platform.",
      deviceId: "deviceId must be 160 characters or less.",
    });

    const storedUser = await User.findById(user._id).lean();
    expect(storedUser.pushTokens).toEqual([]);
  });

  it("revokes a push token without deleting its audit metadata", async () => {
    const user = await createUser({
      pushTokens: [
        {
          token: VALID_EXPO_TOKEN,
          provider: "expo",
          platform: "android",
          deviceId: "logout-device",
        },
      ],
    });

    const response = await request(app)
      .delete("/api/v1/users/push-token")
      .set("Authorization", `Bearer ${signUserToken(user)}`)
      .send({
        token: VALID_EXPO_TOKEN,
        provider: "expo",
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: "Push token revoked successfully",
      revoked: true,
    });

    const storedUser = await User.findById(user._id).lean();
    expect(storedUser.pushTokens).toHaveLength(1);
    expect(storedUser.pushTokens[0]).toMatchObject({
      token: VALID_EXPO_TOKEN,
      disabled: true,
    });
    expect(storedUser.pushTokens[0].revokedAt).toBeInstanceOf(Date);
  });

  it("keeps revoke idempotent for already inactive tokens", async () => {
    const user = await createUser();

    const response = await request(app)
      .delete("/api/v1/users/push-token")
      .set("Authorization", `Bearer ${signUserToken(user)}`)
      .send({
        token: VALID_EXPO_TOKEN,
        provider: "expo",
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: "Push token was already inactive",
      revoked: false,
    });
  });
});
