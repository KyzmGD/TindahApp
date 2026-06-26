const request = require("supertest");
const app = require("../src/app");
const Match = require("../src/models/Match");
const Message = require("../src/models/Message");
const User = require("../src/models/User");

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

describe("auth integration", () => {
  it("registers, stores, logs in, and restores the created account", async () => {
    const password = "password123";
    const registerResponse = await request(app).post("/api/auth/register").send({
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

    const storedUser = await User.findOne({ email: "alex@example.com" }).select("+passwordHash");
    expect(storedUser).toBeTruthy();
    expect(storedUser.passwordHash).toEqual(expect.any(String));
    expect(storedUser.passwordHash).not.toBe(password);
    await expect(storedUser.comparePassword(password)).resolves.toBe(true);

    const duplicateResponse = await request(app).post("/api/auth/register").send({
      name: "Alex Duplicate",
      email: "alex@example.com",
      password,
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
      .send({ text: "Hi Bob" });
    expect(messageResponse.status).toBe(201);
    expect(messageResponse.body.message).toMatchObject({
      _id: expect.any(String),
      text: "Hi Bob",
    });
    await expect(Message.countDocuments({ match: matchId })).resolves.toBe(1);
  });

  it("blocks chat access after unmatching", async () => {
    const alice = await registerUser({ name: "Alice", email: "alice2@example.com" });
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
