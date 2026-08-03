const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const User = require("../src/models/User");
const GamerRecruitment = require("../src/models/GamerRecruitment");
const GamerTeamMatch = require("../src/models/GamerTeamMatch");
const Match = require("../src/models/Match");

function signUserToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
}

function birthDateForAge(age) {
  const birthDate = new Date();
  birthDate.setFullYear(birthDate.getFullYear() - age);
  birthDate.setMonth(0, 1);
  birthDate.setHours(0, 0, 0, 0);
  return birthDate;
}

async function createUser(overrides = {}) {
  return User.create({
    name: overrides.name || "Gamer",
    email: overrides.email || `${Date.now()}-${Math.random()}@example.com`,
    passwordHash: "hashed-password",
    birthDate: birthDateForAge(overrides.age || 24),
    gender: overrides.gender || "man",
    isOnline: overrides.isOnline || false,
    lastActive: overrides.lastActive || new Date("2026-01-01T00:00:00.000Z"),
    avatarUrl: overrides.avatarUrl || "",
    photos: overrides.photos || [],
    gamingProfiles: overrides.gamingProfiles || [],
  });
}

describe("Gamer recruitment posts", () => {
  it("creates a recruitment post and derives the lobby group from rank", async () => {
    const owner = await createUser({
      name: "TFT Recruiter",
      email: "tft-recruiter@example.com",
      isOnline: true,
      avatarUrl: "https://cdn.example.com/avatar.jpg",
      photos: [{ url: "https://cdn.example.com/photo.jpg", isPrimary: true }],
      gamingProfiles: [
        {
          gameName: "TFT",
          currentRank: "Gold",
          inGameID: "RecruiterTFT",
        },
      ],
    });

    const response = await request(app)
      .post("/api/v1/gamer-lobby/recruitments")
      .set("Authorization", `Bearer ${signUserToken(owner)}`)
      .send({
        gameName: "TFT",
        currentRank: "Gold",
        teamSize: 4,
        playMode: "ranked",
        description: "Looking for a consistent squad.",
      });

    expect(response.status).toBe(201);
    expect(response.body.recruitment).toMatchObject({
      gameName: "TFT",
      currentRank: "Gold",
      lobbyGroup: "group1",
      teamSize: 4,
      playMode: "ranked",
      description: "Looking for a consistent squad.",
      note: "Looking for a consistent squad.",
      status: "open",
    });
    expect(response.body.recruitment.owner).toMatchObject({
      id: owner._id.toString(),
      name: "TFT Recruiter",
      avatarUrl: "https://cdn.example.com/avatar.jpg",
      isOnline: true,
    });
    expect(response.body.recruitment.owner.photos).toHaveLength(1);

    const savedPost = await GamerRecruitment.findById(response.body.recruitment.id);
    expect(savedPost.lobbyGroup).toBe("group1");
    expect(savedPost.owner.toString()).toBe(owner._id.toString());
    expect(savedPost.description).toBe("Looking for a consistent squad.");
  });

  it("rejects unsupported game, rank, team size, and play mode", async () => {
    const owner = await createUser({
      email: "invalid-recruiter@example.com",
    });

    const response = await request(app)
      .post("/api/v1/gamer-lobby/recruitments")
      .set("Authorization", `Bearer ${signUserToken(owner)}`)
      .send({
        gameName: "CSGO",
        currentRank: "Unknown",
        teamSize: 3,
        playMode: "scrim",
      });

    expect(response.status).toBe(400);
    expect(response.body.details).toMatchObject({
      gameName: "Select a supported game.",
      currentRank: "Current rank does not match the selected game.",
      teamSize: "Team size must be 2 or 4.",
      playMode: "Play mode must be ranked or casual.",
    });
  });

  it("accepts the Free Fire Heroic rank used by the frontend recruitment sheet", async () => {
    const owner = await createUser({
      name: "Free Fire Recruiter",
      email: "free-fire-recruiter@example.com",
    });

    const response = await request(app)
      .post("/api/v1/gamer-lobby/recruitments")
      .set("Authorization", `Bearer ${signUserToken(owner)}`)
      .send({
        gameName: "FreeFire",
        currentRank: "Heroic 1 star",
        teamSize: 2,
        playMode: "casual",
        lobbyCode: "123456",
        description: "Need a duo for tonight.",
      });

    expect(response.status).toBe(201);
    expect(response.body.recruitment).toMatchObject({
      gameName: "FreeFire",
      currentRank: "Heroic 1 star",
      lobbyGroup: "group2",
      teamSize: 2,
      playMode: "casual",
      lobbyCode: "123456",
      description: "Need a duo for tonight.",
    });
  });

  it("validates manual lobby codes for supported recruitment games", async () => {
    const owner = await createUser({
      name: "Code Recruiter",
      email: "code-recruiter@example.com",
    });

    const invalidValorantResponse = await request(app)
      .post("/api/v1/gamer-lobby/recruitments")
      .set("Authorization", `Bearer ${signUserToken(owner)}`)
      .send({
        gameName: "Valorant",
        currentRank: "Gold",
        teamSize: 2,
        playMode: "ranked",
        lobbyCode: "ABC12",
      });

    expect(invalidValorantResponse.status).toBe(400);
    expect(invalidValorantResponse.body.details).toMatchObject({
      lobbyCode: "Valorant lobby code must contain exactly 6 letters or numbers.",
    });

    const invalidLienQuanResponse = await request(app)
      .post("/api/v1/gamer-lobby/recruitments")
      .set("Authorization", `Bearer ${signUserToken(owner)}`)
      .send({
        gameName: "LienQuan",
        currentRank: "Diamond",
        teamSize: 4,
        playMode: "casual",
        lobbyCode: "A12345",
      });

    expect(invalidLienQuanResponse.status).toBe(400);
    expect(invalidLienQuanResponse.body.details).toMatchObject({
      lobbyCode: "LienQuan lobby code must contain exactly 6 digits.",
    });

    const validValorantResponse = await request(app)
      .post("/api/v1/gamer-lobby/recruitments")
      .set("Authorization", `Bearer ${signUserToken(owner)}`)
      .send({
        gameName: "Valorant",
        currentRank: "Gold",
        teamSize: 2,
        playMode: "ranked",
        lobbyCode: "ab12c3",
      });

    expect(validValorantResponse.status).toBe(201);
    expect(validValorantResponse.body.recruitment).toMatchObject({
      gameName: "Valorant",
      lobbyCode: "AB12C3",
    });
  });

  it("lists only open recruitment posts for the requested game and lobby", async () => {
    const requester = await createUser({
      email: "recruitment-list-requester@example.com",
    });

    const group1Owner = await createUser({
      name: "TFT Gold Owner",
      email: "tft-gold-owner@example.com",
      isOnline: true,
    });
    const group3Owner = await createUser({
      name: "TFT Master Owner",
      email: "tft-master-owner@example.com",
    });
    const valorantOwner = await createUser({
      name: "Valorant Gold Owner",
      email: "valorant-gold-owner@example.com",
    });

    const matchingPost = await GamerRecruitment.create({
      owner: group1Owner._id,
      gameName: "TFT",
      currentRank: "Gold",
      teamSize: 2,
      playMode: "casual",
      description: "Need one flexible player tonight.",
    });

    await GamerRecruitment.create({
      owner: group3Owner._id,
      gameName: "TFT",
      currentRank: "Master",
      teamSize: 4,
      playMode: "ranked",
    });

    await GamerRecruitment.create({
      owner: valorantOwner._id,
      gameName: "Valorant",
      currentRank: "Gold",
      teamSize: 4,
      playMode: "ranked",
      lobbyCode: "VAL123",
    });

    const response = await request(app)
      .get("/api/v1/gamer-lobby/recruitments")
      .set("Authorization", `Bearer ${signUserToken(requester)}`)
      .query({
        game: "TFT",
        lobbyGroup: "Group1",
      });

    expect(response.status).toBe(200);
    expect(response.body.filters).toEqual({
      game: "TFT",
      lobbyGroup: "group1",
    });
    expect(response.body.recruitments).toHaveLength(1);
    expect(response.body.recruitments[0]).toMatchObject({
      id: matchingPost._id.toString(),
      gameName: "TFT",
      lobbyGroup: "group1",
      teamSize: 2,
      playMode: "casual",
      description: "Need one flexible player tonight.",
      note: "Need one flexible player tonight.",
    });
    expect(response.body.recruitments[0].owner).toMatchObject({
      id: group1Owner._id.toString(),
      name: "TFT Gold Owner",
    });
  });

  it("creates an idempotent gamer team match when another user joins a recruitment post", async () => {
    const owner = await createUser({
      name: "Valorant Captain",
      email: "valorant-captain@example.com",
      avatarUrl: "https://cdn.example.com/captain.jpg",
    });
    const joiner = await createUser({
      name: "Valorant Duelist",
      email: "valorant-duelist@example.com",
      avatarUrl: "https://cdn.example.com/duelist.jpg",
      isOnline: true,
    });
    const secondJoiner = await createUser({
      name: "Valorant Sentinel",
      email: "valorant-sentinel@example.com",
    });
    const thirdJoiner = await createUser({
      name: "Valorant Controller",
      email: "valorant-controller@example.com",
    });
    const recruitment = await GamerRecruitment.create({
      owner: owner._id,
      gameName: "Valorant",
      currentRank: "Gold",
      teamSize: 4,
      playMode: "ranked",
      lobbyCode: "ABC123",
      description: "Need one entry player.",
    });

    const response = await request(app)
      .post(`/api/v1/gamer-lobby/recruitments/${recruitment._id}/join`)
      .set("Authorization", `Bearer ${signUserToken(joiner)}`)
      .send();

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      isTeamFound: true,
      message: "Đã tìm thấy đồng đội",
    });
    expect(response.body.recruitment).toMatchObject({
      id: recruitment._id.toString(),
      gameName: "Valorant",
      currentRank: "Gold",
      teamSize: 4,
      lobbyCode: "ABC123",
      memberCount: 2,
      slotsRemaining: 2,
      playMode: "ranked",
      description: "Need one entry player.",
      status: "open",
    });
    expect(response.body.teamMatch).toMatchObject({
      gameName: "Valorant",
      currentRank: "Gold",
      lobbyGroup: "group1",
      teamSize: 4,
      playMode: "ranked",
      lobbyCode: "ABC123",
      description: "Need one entry player.",
      status: "active",
    });
    expect(response.body.teamMatch.owner).toMatchObject({
      id: owner._id.toString(),
      name: "Valorant Captain",
    });
    expect(response.body.teamMatch.joiner).toMatchObject({
      id: joiner._id.toString(),
      name: "Valorant Duelist",
      isOnline: true,
    });
    expect(response.body.chatMatch).toMatchObject({
      source: "gamer_lobby",
      status: "active",
      gamerContext: expect.objectContaining({
        gameName: "Valorant",
        lobbyGroup: "group1",
        teamSize: 4,
        playMode: "ranked",
        lobbyCode: "ABC123",
      }),
    });
    expect(response.body.chatMatch.users.map((user) => user.id).sort()).toEqual([
      joiner._id.toString(),
      owner._id.toString(),
    ].sort());
    await expect(Match.countDocuments()).resolves.toBe(1);
    await expect(
      GamerRecruitment.findById(recruitment._id).then((post) => post.status),
    ).resolves.toBe("open");

    const repeatResponse = await request(app)
      .post(`/api/v1/gamer-lobby/recruitments/${recruitment._id}/join`)
      .set("Authorization", `Bearer ${signUserToken(joiner)}`)
      .send();

    expect(repeatResponse.status).toBe(201);
    expect(repeatResponse.body.teamMatch.id).toBe(response.body.teamMatch.id);
    await expect(GamerTeamMatch.countDocuments()).resolves.toBe(1);
    await expect(Match.countDocuments()).resolves.toBe(1);

    const secondJoinResponse = await request(app)
      .post(`/api/v1/gamer-lobby/recruitments/${recruitment._id}/join`)
      .set("Authorization", `Bearer ${signUserToken(secondJoiner)}`)
      .send();

    expect(secondJoinResponse.status).toBe(201);
    expect(secondJoinResponse.body.recruitment).toMatchObject({
      memberCount: 3,
      slotsRemaining: 1,
      status: "open",
    });

    const thirdJoinResponse = await request(app)
      .post(`/api/v1/gamer-lobby/recruitments/${recruitment._id}/join`)
      .set("Authorization", `Bearer ${signUserToken(thirdJoiner)}`)
      .send();

    expect(thirdJoinResponse.status).toBe(201);
    expect(thirdJoinResponse.body.recruitment).toMatchObject({
      memberCount: 4,
      slotsRemaining: 0,
      status: "closed",
    });
    await expect(GamerTeamMatch.countDocuments()).resolves.toBe(3);
    await expect(Match.countDocuments()).resolves.toBe(3);
    await expect(
      GamerRecruitment.findById(recruitment._id).then((post) => ({
        status: post.status,
        memberCount: post.memberCount,
      })),
    ).resolves.toEqual({
      status: "closed",
      memberCount: 4,
    });
  });

  it("prevents the owner from joining their own recruitment post", async () => {
    const owner = await createUser({
      email: "own-post-joiner@example.com",
    });
    const recruitment = await GamerRecruitment.create({
      owner: owner._id,
      gameName: "TFT",
      currentRank: "Gold",
      teamSize: 2,
      playMode: "casual",
    });

    const response = await request(app)
      .post(`/api/v1/gamer-lobby/recruitments/${recruitment._id}/join`)
      .set("Authorization", `Bearer ${signUserToken(owner)}`)
      .send();

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("You cannot join your own recruitment post.");
    await expect(GamerTeamMatch.countDocuments()).resolves.toBe(0);
  });

  it("allows the owner to close an open recruitment post", async () => {
    const owner = await createUser({
      email: "close-recruitment-owner@example.com",
    });
    const recruitment = await GamerRecruitment.create({
      owner: owner._id,
      gameName: "PUBGMobile",
      currentRank: "Crown",
      teamSize: 4,
      playMode: "ranked",
      description: "Need two more.",
    });

    const response = await request(app)
      .patch(`/api/v1/gamer-lobby/recruitments/${recruitment._id}/close`)
      .set("Authorization", `Bearer ${signUserToken(owner)}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.recruitment).toMatchObject({
      id: recruitment._id.toString(),
      status: "closed",
    });

    const repeatResponse = await request(app)
      .patch(`/api/v1/gamer-lobby/recruitments/${recruitment._id}/close`)
      .set("Authorization", `Bearer ${signUserToken(owner)}`)
      .send();

    expect(repeatResponse.status).toBe(200);
    expect(repeatResponse.body.recruitment).toMatchObject({
      id: recruitment._id.toString(),
      status: "closed",
    });

    const listResponse = await request(app)
      .get("/api/v1/gamer-lobby/recruitments")
      .set("Authorization", `Bearer ${signUserToken(owner)}`)
      .query({
        game: "PUBGMobile",
        lobbyGroup: "Group2",
      });

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.recruitments).toHaveLength(0);
  });

  it("notifies joined teammates when the owner stops recruiting", async () => {
    const owner = await createUser({
      email: "dissolve-owner@example.com",
    });
    const joiner = await createUser({
      email: "dissolve-joiner@example.com",
    });
    const emit = jest.fn();
    const to = jest.fn(() => ({ emit }));
    const recruitment = await GamerRecruitment.create({
      owner: owner._id,
      members: [owner._id, joiner._id],
      memberCount: 2,
      gameName: "TFT",
      currentRank: "Gold",
      teamSize: 4,
      playMode: "ranked",
      description: "Closing this lobby.",
    });
    await GamerTeamMatch.create({
      recruitment: recruitment._id,
      owner: owner._id,
      joiner: joiner._id,
      gameName: "TFT",
      currentRank: "Gold",
      lobbyGroup: "group1",
      teamSize: 4,
      playMode: "ranked",
      description: "Closing this lobby.",
    });
    app.set("io", { to });

    const response = await request(app)
      .patch(`/api/v1/gamer-lobby/recruitments/${recruitment._id}/close`)
      .set("Authorization", `Bearer ${signUserToken(owner)}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.recruitment).toMatchObject({
      id: recruitment._id.toString(),
      status: "closed",
    });
    expect(to).toHaveBeenCalledWith(`user:${joiner._id}`);
    expect(emit).toHaveBeenCalledWith("gamer_lobby:team_dissolved", {
      message: "Đội bạn đã giải tán",
      recruitment: expect.objectContaining({
        id: recruitment._id.toString(),
        status: "closed",
      }),
    });
    await expect(
      GamerTeamMatch.findOne({ recruitment: recruitment._id }).then((teamMatch) => teamMatch.status),
    ).resolves.toBe("closed");

    app.set("io", null);
  });
});
