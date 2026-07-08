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
    expect(response.body.message).toBe("Please fix the highlighted fields.");
    expect(response.body.details.email).toBe("Email is required.");
    expect(response.body.details.password).toBe("Password is required.");
  });

  it("validates register payload before touching the database", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "A",
      email: "not-an-email",
      password: "password",
      birthDate: "2020-01-01",
    });

    expect(response.status).toBe(400);
    expect(response.body.details.name).toBe("Name must be at least 2 characters.");
    expect(response.body.details.email).toBe("Enter a valid email address.");
    expect(response.body.details.password).toBe("Password needs at least one number.");
    expect(response.body.details.birthDate).toBe("You must be at least 18 years old.");
  });
});
