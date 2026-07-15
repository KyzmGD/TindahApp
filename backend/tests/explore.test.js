const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const User = require("../src/models/User");

describe("GET /api/v1/users/explore", () => {
  beforeAll(async () => {
    await User.init();
  });

  it("returns nearby users and excludes the requester", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "requester@example.com",
      passwordHash: "hashed-password",
      location: {
        type: "Point",
        coordinates: [0, 0],
      },
    });

    await User.create({
      name: "Near User",
      email: "near@example.com",
      passwordHash: "hashed-password",
      location: {
        type: "Point",
        coordinates: [0.01, 0.01],
      },
    });

    await User.create({
      name: "Far User",
      email: "far@example.com",
      passwordHash: "hashed-password",
      location: {
        type: "Point",
        coordinates: [2, 2],
      },
    });

    const token = jwt.sign(
      { sub: requester._id.toString(), email: requester.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    const response = await request(app)
      .get("/api/v1/users/explore")
      .set("Authorization", `Bearer ${token}`)
      .query({ lat: 0, lng: 0, radiusKm: 20 });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.users)).toBe(true);
    expect(
      response.body.users.some((user) => user.id === requester._id.toString()),
    ).toBe(false);
  });
});
