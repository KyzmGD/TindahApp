const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const Match = require("../src/models/Match");
const Message = require("../src/models/Message");
const Swipe = require("../src/models/Swipe");
const User = require("../src/models/User");
const {
  resetExpoClientForTesting,
  setExpoClientForTesting,
} = require("../src/services/notification.service");

const VALID_EXPO_PUSH_TOKEN = "ExponentPushToken[matchpushaaaaaaaaaaaa]";

afterEach(() => {
  resetExpoClientForTesting();
  app.set("io", null);
});

async function registerUser(overrides = {}) {
  const payload = {
    name: "Test User",
    email: `user-${Date.now()}-${Math.random()}@example.com`,
    password: "password123",
    birthDate: "1998-01-01",
    gender: "other",
    ...overrides,
  };

  const response = await request(app).post("/api/auth/register").send(payload);

  expect(response.status).toBe(201);

  return {
    payload,
    token: response.body.token,
    user: response.body.user,
    response,
  };
}

async function createReciprocalMatch(userA, userB) {
  await request(app)
    .post("/api/v1/swipes")
    .set("Authorization", `Bearer ${userA.token}`)
    .send({ targetId: userB.user.id, type: "like" })
    .expect(201);

  const response = await request(app)
    .post("/api/v1/swipes")
    .set("Authorization", `Bearer ${userB.token}`)
    .send({ targetId: userA.user.id, type: "like" })
    .expect(201);

  expect(response.body.isMatch).toBe(true);
  return response.body.match;
}

async function seedMessages({ matchId, senderIds, prefix, count }) {
  const baseDate = new Date("2026-01-01T00:00:00.000Z");
  const docs = Array.from({ length: count }, (_, index) => {
    const createdAt = new Date(baseDate.getTime() + index * 1000);
    const senderId = senderIds[index % senderIds.length];

    return {
      match: new mongoose.Types.ObjectId(matchId),
      sender: new mongoose.Types.ObjectId(senderId),
      text: `${prefix} ${index + 1}`,
      readBy: [new mongoose.Types.ObjectId(senderId)],
      createdAt,
      updatedAt: createdAt,
    };
  });

  await Message.collection.insertMany(docs);
  return docs;
}

describe("auth integration", () => {
  it("registers, stores, logs in, and restores the created account", async () => {
    const password = "password123";
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Alex Stored",
        email: "alex@example.com",
        password,
        birthDate: "1997-03-14",
        gender: "woman",
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.token).toEqual(expect.any(String));
    expect(registerResponse.body.user).toMatchObject({
      id: expect.any(String),
      name: "Alex Stored",
      email: "alex@example.com",
      gender: "woman",
    });

    const storedUser = await User.findOne({ email: "alex@example.com" }).select(
      "+passwordHash",
    );
    expect(storedUser).toBeTruthy();
    expect(storedUser.passwordHash).toEqual(expect.any(String));
    expect(storedUser.passwordHash).not.toBe(password);
    await expect(storedUser.comparePassword(password)).resolves.toBe(true);

    const duplicateResponse = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Alex Duplicate",
        email: "alex@example.com",
        password,
        birthDate: "1997-03-14",
        gender: "woman",
      });
    expect(duplicateResponse.status).toBe(409);

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "alex@example.com",
      password,
    });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toEqual(expect.any(String));
    expect(loginResponse.body.user.id).toBe(registerResponse.body.user.id);

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginResponse.body.token}`);
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user).toMatchObject({
      id: registerResponse.body.user.id,
      email: "alex@example.com",
      name: "Alex Stored",
    });
  });
});

describe("v1 swipe matching engine", () => {
  it("creates exactly one match when two users like each other", async () => {
    const alice = await registerUser({
      name: "Alice V1",
      email: "alice-v1@example.com",
    });
    const bob = await registerUser({
      name: "Bob V1",
      email: "bob-v1@example.com",
    });

    const firstSwipeResponse = await request(app)
      .post("/api/v1/swipes")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ targetId: bob.user.id, type: "like" });

    expect(firstSwipeResponse.status).toBe(201);
    expect(firstSwipeResponse.body.isMatch).toBe(false);
    expect(firstSwipeResponse.body.match).toBeNull();
    await expect(Match.countDocuments()).resolves.toBe(0);

    const doubleLikeResponse = await request(app)
      .post("/api/v1/swipes")
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ targetId: alice.user.id, type: "like" });

    expect(doubleLikeResponse.status).toBe(201);
    expect(doubleLikeResponse.body.isMatch).toBe(true);
    expect(doubleLikeResponse.body.match).toMatchObject({
      _id: expect.any(String),
      status: "active",
    });

    const storedMatch = await Match.findById(doubleLikeResponse.body.match._id).lean();
    expect(storedMatch.users.map((userId) => userId.toString()).sort()).toEqual(
      [alice.user.id, bob.user.id].sort(),
    );
    expect(new Set(storedMatch.users.map((userId) => userId.toString())).size).toBe(2);
    await expect(Match.countDocuments()).resolves.toBe(1);

    const repeatedLikeResponse = await request(app)
      .post("/api/v1/swipes")
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ targetId: alice.user.id, type: "like" });

    expect(repeatedLikeResponse.status).toBe(201);
    expect(repeatedLikeResponse.body.isMatch).toBe(true);
    expect(repeatedLikeResponse.body.match._id).toBe(doubleLikeResponse.body.match._id);
    await expect(Match.countDocuments()).resolves.toBe(1);
  });

  it("records pass swipes without creating a match", async () => {
    const alice = await registerUser({
      name: "Alice Pass",
      email: "alice-pass@example.com",
    });
    const bob = await registerUser({
      name: "Bob Pass",
      email: "bob-pass@example.com",
    });

    const response = await request(app)
      .post("/api/v1/swipes")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ targetId: bob.user.id, type: "pass" });

    expect(response.status).toBe(201);
    expect(response.body.isMatch).toBe(false);
    expect(response.body.swipe).toMatchObject({
      direction: "nope",
    });
    await expect(Match.countDocuments()).resolves.toBe(0);
  });

  it("creates one match when both users like each other at the same time", async () => {
    const alice = await registerUser({
      name: "Alice Race",
      email: "alice-race@example.com",
    });
    const bob = await registerUser({
      name: "Bob Race",
      email: "bob-race@example.com",
    });

    const [aliceResponse, bobResponse] = await Promise.all([
      request(app)
        .post("/api/v1/swipes")
        .set("Authorization", `Bearer ${alice.token}`)
        .send({ targetId: bob.user.id, type: "like" }),
      request(app)
        .post("/api/v1/swipes")
        .set("Authorization", `Bearer ${bob.token}`)
        .send({ targetId: alice.user.id, type: "like" }),
    ]);

    expect([aliceResponse.status, bobResponse.status]).toEqual([201, 201]);

    const responses = [aliceResponse.body, bobResponse.body];
    expect(responses.every((body) => body.isMatch)).toBe(true);
    expect(new Set(responses.map((body) => body.match?._id)).size).toBe(1);

    const storedMatches = await Match.find().lean();
    expect(storedMatches).toHaveLength(1);
    expect(storedMatches[0].users.map((userId) => userId.toString()).sort()).toEqual(
      [alice.user.id, bob.user.id].sort(),
    );

    await expect(
      Swipe.countDocuments({
        swiper: { $in: [alice.user.id, bob.user.id] },
        target: { $in: [alice.user.id, bob.user.id] },
      }),
    ).resolves.toBe(2);
  });

  it("sends a push notification to the offline matched user", async () => {
    const expoClient = {
      chunkPushNotifications: jest.fn((messages) => [messages]),
      sendPushNotificationsAsync: jest.fn().mockResolvedValue([{ status: "ok", id: "ticket-1" }]),
    };
    setExpoClientForTesting(expoClient);

    const alice = await registerUser({
      name: "Alice Offline Push",
      email: "alice-offline-push@example.com",
    });
    const bob = await registerUser({
      name: "Bob Offline Push",
      email: "bob-offline-push@example.com",
    });

    await User.findByIdAndUpdate(alice.user.id, {
      $push: {
        pushTokens: {
          token: VALID_EXPO_PUSH_TOKEN,
          provider: "expo",
          platform: "android",
          deviceId: "alice-device",
        },
      },
    });

    await request(app)
      .post("/api/v1/swipes")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ targetId: bob.user.id, type: "like" })
      .expect(201);

    const response = await request(app)
      .post("/api/v1/swipes")
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ targetId: alice.user.id, type: "like" })
      .expect(201);

    expect(response.body.isMatch).toBe(true);
    expect(expoClient.sendPushNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(expoClient.sendPushNotificationsAsync).toHaveBeenCalledWith([
      expect.objectContaining({
        to: VALID_EXPO_PUSH_TOKEN,
        title: "It's a match!",
        body: "You and Bob Offline Push liked each other.",
        channelId: "matches",
        priority: "high",
        data: {
          type: "match",
          matchId: response.body.match._id,
          userId: bob.user.id,
        },
      }),
    ]);
    expect(JSON.stringify(response.body.match)).not.toContain(VALID_EXPO_PUSH_TOKEN);
  });

  it("does not send a match push notification when the matched user is online", async () => {
    const expoClient = {
      chunkPushNotifications: jest.fn((messages) => [messages]),
      sendPushNotificationsAsync: jest.fn().mockResolvedValue([{ status: "ok", id: "ticket-1" }]),
    };
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    setExpoClientForTesting(expoClient);

    const alice = await registerUser({
      name: "Alice Online Push",
      email: "alice-online-push@example.com",
    });
    const bob = await registerUser({
      name: "Bob Online Push",
      email: "bob-online-push@example.com",
    });

    await User.findByIdAndUpdate(alice.user.id, {
      $push: {
        pushTokens: {
          token: VALID_EXPO_PUSH_TOKEN,
          provider: "expo",
          platform: "android",
          deviceId: "alice-device",
        },
      },
    });
    app.set("io", {
      sockets: {
        adapter: {
          rooms: new Map([[`user:${alice.user.id}`, new Set(["socket-1"])]]),
        },
      },
      to,
    });

    await request(app)
      .post("/api/v1/swipes")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ targetId: bob.user.id, type: "like" })
      .expect(201);

    const response = await request(app)
      .post("/api/v1/swipes")
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ targetId: alice.user.id, type: "like" })
      .expect(201);

    expect(response.body.isMatch).toBe(true);
    expect(expoClient.sendPushNotificationsAsync).not.toHaveBeenCalled();
    expect(to).toHaveBeenCalledWith(`user:${alice.user.id}`);
    expect(to).toHaveBeenCalledWith(`user:${bob.user.id}`);
    expect(emit).toHaveBeenCalledWith("match:new", expect.objectContaining({
      _id: expect.anything(),
    }));
  });
});

describe("v1 message history pagination", () => {
  it("returns only messages for the requested match sorted by newest first", async () => {
    const alice = await registerUser({
      name: "Alice History",
      email: "alice-history@example.com",
    });
    const bob = await registerUser({
      name: "Bob History",
      email: "bob-history@example.com",
    });
    const casey = await registerUser({
      name: "Casey History",
      email: "casey-history@example.com",
    });

    const aliceBobMatch = await createReciprocalMatch(alice, bob);
    const aliceCaseyMatch = await createReciprocalMatch(alice, casey);

    await seedMessages({
      matchId: aliceBobMatch._id,
      senderIds: [alice.user.id, bob.user.id],
      prefix: "AB",
      count: 25,
    });
    await seedMessages({
      matchId: aliceCaseyMatch._id,
      senderIds: [alice.user.id, casey.user.id],
      prefix: "AC",
      count: 3,
    });

    const response = await request(app)
      .get(`/api/v1/messages/${aliceBobMatch._id}`)
      .query({ page: 2, limit: 10 })
      .set("Authorization", `Bearer ${alice.token}`);

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });
    expect(response.body.messages).toHaveLength(10);
    expect(response.body.messages.map((message) => message.text)).toEqual([
      "AB 15",
      "AB 14",
      "AB 13",
      "AB 12",
      "AB 11",
      "AB 10",
      "AB 9",
      "AB 8",
      "AB 7",
      "AB 6",
    ]);
    expect(response.body.messages.every((message) => message.text.startsWith("AB"))).toBe(true);

    const timestamps = response.body.messages.map((message) => new Date(message.createdAt).getTime());
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it("uses a default limit of 20 and blocks users outside the match", async () => {
    const alice = await registerUser({
      name: "Alice Default History",
      email: "alice-default-history@example.com",
    });
    const bob = await registerUser({
      name: "Bob Default History",
      email: "bob-default-history@example.com",
    });
    const outsider = await registerUser({
      name: "Outsider History",
      email: "outsider-history@example.com",
    });

    const match = await createReciprocalMatch(alice, bob);

    await seedMessages({
      matchId: match._id,
      senderIds: [alice.user.id, bob.user.id],
      prefix: "Default",
      count: 21,
    });

    const response = await request(app)
      .get(`/api/v1/messages/${match._id}`)
      .set("Authorization", `Bearer ${alice.token}`);

    expect(response.status).toBe(200);
    expect(response.body.messages).toHaveLength(20);
    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 21,
      totalPages: 2,
      hasNextPage: true,
      hasPrevPage: false,
    });
    expect(response.body.messages[0].text).toBe("Default 21");

    const blockedResponse = await request(app)
      .get(`/api/v1/messages/${match._id}`)
      .set("Authorization", `Bearer ${outsider.token}`);

    expect(blockedResponse.status).toBe(404);
    expect(blockedResponse.body.message).toBe("Match not found");
  });
});

describe("match-gated chat integration", () => {
  it("shows chats only after a reciprocal match and gates messages by match membership", async () => {
    const alice = await registerUser({
      name: "Alice",
      email: "alice@example.com",
      gender: "woman",
    });
    const bob = await registerUser({
      name: "Bob",
      email: "bob@example.com",
      gender: "man",
    });
    const casey = await registerUser({
      name: "Casey",
      email: "casey@example.com",
      gender: "nonbinary",
    });

    const firstSwipeResponse = await request(app)
      .post("/api/swipes")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ targetUserId: bob.user.id, direction: "like" });

    expect(firstSwipeResponse.status).toBe(201);
    expect(firstSwipeResponse.body.isMatch).toBe(false);
    expect(firstSwipeResponse.body.match).toBeNull();
    await expect(Match.countDocuments()).resolves.toBe(0);

    const aliceMatchesBeforeReciprocal = await request(app)
      .get("/api/matches")
      .set("Authorization", `Bearer ${alice.token}`);
    expect(aliceMatchesBeforeReciprocal.status).toBe(200);
    expect(aliceMatchesBeforeReciprocal.body.matches).toHaveLength(0);

    const reciprocalSwipeResponse = await request(app)
      .post("/api/swipes")
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ targetUserId: alice.user.id, direction: "like" });

    expect(reciprocalSwipeResponse.status).toBe(201);
    expect(reciprocalSwipeResponse.body.isMatch).toBe(true);
    expect(reciprocalSwipeResponse.body.match).toMatchObject({
      _id: expect.any(String),
      status: "active",
    });
    await expect(Match.countDocuments({ status: "active" })).resolves.toBe(1);

    const matchId = reciprocalSwipeResponse.body.match._id;

    const fakeExpoClient = {
      chunkPushNotifications: jest.fn((messages) => [messages]),
      sendPushNotificationsAsync: jest.fn(async (messages) => (
        messages.map(() => ({ status: "ok" }))
      )),
    };
    setExpoClientForTesting(fakeExpoClient);
    await User.findByIdAndUpdate(bob.user.id, {
      pushTokens: [
        {
          token: VALID_EXPO_PUSH_TOKEN,
          provider: "expo",
          platform: "android",
          deviceId: "bob-chat-device",
        },
      ],
    });

    const aliceMatches = await request(app)
      .get("/api/matches")
      .set("Authorization", `Bearer ${alice.token}`);
    expect(aliceMatches.status).toBe(200);
    expect(aliceMatches.body.matches).toHaveLength(1);
    expect(aliceMatches.body.matches[0]._id).toBe(matchId);

    const bobMatches = await request(app)
      .get("/api/matches")
      .set("Authorization", `Bearer ${bob.token}`);
    expect(bobMatches.status).toBe(200);
    expect(bobMatches.body.matches).toHaveLength(1);
    expect(bobMatches.body.matches[0]._id).toBe(matchId);

    const caseyMatches = await request(app)
      .get("/api/matches")
      .set("Authorization", `Bearer ${casey.token}`);
    expect(caseyMatches.status).toBe(200);
    expect(caseyMatches.body.matches).toHaveLength(0);

    const blockedMessageResponse = await request(app)
      .post(`/api/chats/${matchId}/messages`)
      .set("Authorization", `Bearer ${casey.token}`)
      .send({ text: "Can I join?" });
    expect(blockedMessageResponse.status).toBe(404);
    expect(blockedMessageResponse.body.message).toBe("Match not found");

    const messageResponse = await request(app)
      .post(`/api/chats/${matchId}/messages`)
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ text: "Hi Bob", clientMessageId: "chat-push-once" });
    expect(messageResponse.status).toBe(201);
    expect(messageResponse.body.message).toMatchObject({
      _id: expect.any(String),
      text: "Hi Bob",
    });
    await expect(Message.countDocuments({ match: matchId })).resolves.toBe(1);
    expect(fakeExpoClient.sendPushNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(fakeExpoClient.sendPushNotificationsAsync).toHaveBeenCalledWith([
      expect.objectContaining({
        to: VALID_EXPO_PUSH_TOKEN,
        title: "Alice",
        body: "Hi Bob",
        channelId: "messages",
        priority: "high",
        data: {
          type: "message",
          matchId,
          messageId: messageResponse.body.message._id,
          senderId: alice.user.id,
        },
      }),
    ]);

    await request(app)
      .post(`/api/chats/${matchId}/messages`)
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ text: "Hi Bob", clientMessageId: "chat-push-once" })
      .expect(201);
    await expect(Message.countDocuments({ match: matchId })).resolves.toBe(1);
    expect(fakeExpoClient.sendPushNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it("blocks chat access after unmatching", async () => {
    const alice = await registerUser({
      name: "Alice",
      email: "alice2@example.com",
    });
    const bob = await registerUser({ name: "Bob", email: "bob2@example.com" });

    await request(app)
      .post("/api/swipes")
      .set("Authorization", `Bearer ${alice.token}`)
      .send({ targetUserId: bob.user.id, direction: "like" })
      .expect(201);

    const reciprocalSwipeResponse = await request(app)
      .post("/api/swipes")
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ targetUserId: alice.user.id, direction: "like" })
      .expect(201);

    const matchId = reciprocalSwipeResponse.body.match._id;

    const unmatchResponse = await request(app)
      .patch(`/api/matches/${matchId}/unmatch`)
      .set("Authorization", `Bearer ${alice.token}`);
    expect(unmatchResponse.status).toBe(200);

    const aliceMatches = await request(app)
      .get("/api/matches")
      .set("Authorization", `Bearer ${alice.token}`);
    expect(aliceMatches.status).toBe(200);
    expect(aliceMatches.body.matches).toHaveLength(0);

    const messageResponse = await request(app)
      .post(`/api/chats/${matchId}/messages`)
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ text: "Still there?" });
    expect(messageResponse.status).toBe(404);
    expect(messageResponse.body.message).toBe("Match not found");
  });
});
