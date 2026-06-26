const request = require("supertest");
const app = require("../src/app");

describe("auth routes", () => {
  it("returns API health", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("validates login payload before touching the database", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email and password are required");
  });
});
