const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const User = require("../src/models/User");

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

describe("GET /api/v1/gamer-lobby/explore", () => {
  it("filters TFT Group1 users without mixing high-rank TFT users", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "gamer-requester@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(24),
      gender: "man",
      gamingProfiles: [
        {
          gameName: "TFT",
          currentRank: "Vàng",
          lobbyGroup: "group1",
          inGameID: "RequesterTFT",
        },
      ],
    });

    const offlineGroup1 = await User.create({
      name: "Offline TFT Silver",
      email: "offline-tft-silver@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(23),
      gender: "woman",
      isOnline: false,
      lastActive: new Date("2026-01-01T00:00:00.000Z"),
      gamingProfiles: [
        {
          gameName: "TFT",
          currentRank: "Bạc",
          inGameID: "SilverTFT",
        },
      ],
    });

    const onlineGroup1 = await User.create({
      name: "Online TFT Gold",
      email: "online-tft-gold@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(25),
      gender: "man",
      isOnline: true,
      lastActive: new Date("2026-01-02T00:00:00.000Z"),
      gamingProfiles: [
        {
          gameName: "TFT",
          currentRank: "Vàng",
          inGameID: "GoldTFT",
        },
      ],
    });

    await User.create({
      name: "TFT Master",
      email: "tft-master@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(26),
      gender: "man",
      isOnline: true,
      lastActive: new Date("2026-01-03T00:00:00.000Z"),
      gamingProfiles: [
        {
          gameName: "TFT",
          currentRank: "Cao Thủ",
          inGameID: "MasterTFT",
        },
      ],
    });

    await User.create({
      name: "Valorant Gold",
      email: "valorant-gold@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(22),
      gender: "woman",
      isOnline: true,
      lastActive: new Date("2026-01-04T00:00:00.000Z"),
      gamingProfiles: [
        {
          gameName: "Valorant",
          currentRank: "Vàng",
          inGameID: "ValorantGold",
        },
      ],
    });

    const response = await request(app)
      .get("/api/v1/gamer-lobby/explore")
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

    const returnedIds = response.body.users.map((user) => user.id);
    expect(returnedIds).toEqual([
      onlineGroup1._id.toString(),
      offlineGroup1._id.toString(),
    ]);
    expect(returnedIds).not.toContain(requester._id.toString());
    expect(response.body.users.every((user) => user.gamingProfile.gameName === "TFT")).toBe(true);
    expect(response.body.users.every((user) => user.gamingProfile.lobbyGroup === "group1")).toBe(true);
    expect(response.body.users.map((user) => user.gamingProfile.currentRank)).toEqual([
      "Vàng",
      "Bạc",
    ]);
  });

  it("rejects unsupported game or lobby query values", async () => {
    const requester = await User.create({
      name: "Invalid Lobby Requester",
      email: "invalid-lobby-requester@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(24),
      gender: "man",
    });

    const response = await request(app)
      .get("/api/v1/gamer-lobby/explore")
      .set("Authorization", `Bearer ${signUserToken(requester)}`)
      .query({
        game: "CSGO",
        lobbyGroup: "Group9",
      });

    expect(response.status).toBe(400);
    expect(response.body.details).toMatchObject({
      game: "Select a supported game.",
      lobbyGroup: "Select a supported lobby group.",
    });
  });
});
