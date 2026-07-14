const request = require("supertest");
const app = require("../src/app");

function buildRegisterPayload(overrides = {}) {
  return {
    name: "Test User",
    email: `auth-${Date.now()}-${Math.random()}@example.com`,
    password: "Password123",
    birthDate: "1995-05-20",
    gender: "woman",
    ...overrides,
  };
}

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
    expect(response.body.details.name).toBe(
      "Name must be at least 2 characters.",
    );
    expect(response.body.details.email).toBe("Enter a valid email address.");
    expect(response.body.details.password).toBe(
      "Password needs at least one number.",
    );
    expect(response.body.details.birthDate).toBe(
      "You must be at least 18 years old.",
    );
  });

  it("registers a new user successfully and returns a JWT", async () => {
    const payload = buildRegisterPayload();
    const response = await request(app)
      .post("/api/auth/register")
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      id: expect.any(String),
      email: payload.email,
      name: payload.name,
      gender: payload.gender,
    });
  });

  it("rejects duplicate email during registration", async () => {
    const payload = buildRegisterPayload({ email: "duplicate@example.com" });

    const firstResponse = await request(app)
      .post("/api/auth/register")
      .send(payload);
    const secondResponse = await request(app)
      .post("/api/auth/register")
      .send(payload);

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.message).toBe("Email is already registered");
  });

  it("rejects registration when required fields are missing", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "missing@example.com",
      password: "Password123",
      birthDate: "1995-05-20",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Please fix the highlighted fields.");
    expect(response.body.details.name).toBe("Name is required.");
  });

  it("logs in successfully and returns a JWT", async () => {
    const payload = buildRegisterPayload({
      email: "login-success@example.com",
    });
    await request(app).post("/api/auth/register").send(payload);

    const response = await request(app).post("/api/auth/login").send({
      email: payload.email,
      password: payload.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe(payload.email);
  });

  it("rejects login when the password is wrong", async () => {
    const payload = buildRegisterPayload({
      email: "wrong-password@example.com",
    });
    await request(app).post("/api/auth/register").send(payload);

    const response = await request(app).post("/api/auth/login").send({
      email: payload.email,
      password: "WrongPassword123",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });
});
