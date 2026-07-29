const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");

const PASSWORD = "Password123";
let emailSequence = 0;

function uniqueEmail(label) {
  emailSequence += 1;
  return `${label}.${Date.now()}.${emailSequence}@example.test`;
}

function birthDateForAge(age) {
  const birthday = new Date();
  birthday.setUTCFullYear(birthday.getUTCFullYear() - age);
  birthday.setUTCMonth(0, 1);
  birthday.setUTCHours(0, 0, 0, 0);
  return birthday.toISOString().slice(0, 10);
}

async function registerUser({
  name,
  gender,
  age = 30,
}) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name,
      email: uniqueEmail(name.toLowerCase().replace(/\s+/g, "-")),
      password: PASSWORD,
      birthDate: birthDateForAge(age),
      gender,
    });

  expect(response.status).toBe(201);

  return {
    token: response.body.token,
    user: response.body.user,
  };
}

async function updateAccount(token, payload) {
  const response = await request(app)
    .patch("/api/auth/me")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);

  expect(response.status).toBe(200);
  return response.body.user;
}

async function updateProfile(token, payload) {
  const response = await request(app)
    .put("/api/v1/users/profile")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);

  expect(response.status).toBe(200);
  return response.body.user;
}

async function explore(token, query = {}) {
  return request(app)
    .get("/api/v1/users/explore")
    .set("Authorization", `Bearer ${token}`)
    .query(query);
}

async function discover(token, query = {}) {
  return request(app)
    .get("/api/v1/swipes/discover")
    .set("Authorization", `Bearer ${token}`)
    .query(query);
}

function idsFrom(response) {
  return response.body.users.map((user) => user.id);
}

async function seedCandidate({
  name,
  gender,
  age,
  interestedIn,
  coordinates = [0.01, 0.01],
}) {
  const candidate = await registerUser({ name, gender, age });
  await updateAccount(candidate.token, {
    interestedIn,
    location: {
      type: "Point",
      coordinates,
    },
  });
  return candidate;
}

beforeAll(async () => {
  await User.init();
});

describe("Black-box discovery filter accuracy", () => {
  it("filters explore results by gender preference, age range, mutual interest, and self exclusion", async () => {
    const requester = await registerUser({
      name: "Requester",
      gender: "man",
      age: 29,
    });

    await updateAccount(requester.token, {
      location: {
        type: "Point",
        coordinates: [0, 0],
      },
    });

    await updateProfile(requester.token, {
      genderPreference: ["woman"],
      minAge: 25,
      maxAge: 35,
      maxDistanceKm: 50,
    });

    const matchingCandidate = await seedCandidate({
      name: "Matching Candidate",
      gender: "woman",
      age: 30,
      interestedIn: ["man"],
    });

    const wrongGender = await seedCandidate({
      name: "Wrong Gender",
      gender: "man",
      age: 30,
      interestedIn: ["man"],
    });

    const tooYoung = await seedCandidate({
      name: "Too Young",
      gender: "woman",
      age: 24,
      interestedIn: ["man"],
    });

    const tooOld = await seedCandidate({
      name: "Too Old",
      gender: "woman",
      age: 36,
      interestedIn: ["man"],
    });

    const nonMutual = await seedCandidate({
      name: "Non Mutual",
      gender: "woman",
      age: 30,
      interestedIn: ["woman"],
    });

    const response = await explore(requester.token, {
      lat: 0,
      lng: 0,
      radiusKm: 20,
    });

    expect(response.status).toBe(200);
    expect(idsFrom(response)).toEqual([matchingCandidate.user.id]);
    expect(idsFrom(response)).not.toEqual(
      expect.arrayContaining([
        requester.user.id,
        wrongGender.user.id,
        tooYoung.user.id,
        tooOld.user.id,
        nonMutual.user.id,
      ]),
    );
  });

  it("applies distance radius boundaries to /api/v1/users/explore", async () => {
    const requester = await registerUser({
      name: "Distance Requester",
      gender: "man",
      age: 32,
    });

    await updateProfile(requester.token, {
      genderPreference: ["woman"],
      minAge: 18,
      maxAge: 60,
    });

    const nearCandidate = await seedCandidate({
      name: "Near Candidate",
      gender: "woman",
      age: 28,
      interestedIn: ["man"],
      coordinates: [0.01, 0.01],
    });

    const farCandidate = await seedCandidate({
      name: "Far Candidate",
      gender: "woman",
      age: 28,
      interestedIn: ["man"],
      coordinates: [0.3, 0.3],
    });

    const smallRadiusResponse = await explore(requester.token, {
      lat: 0,
      lng: 0,
      radiusKm: 5,
    });

    expect(smallRadiusResponse.status).toBe(200);
    expect(idsFrom(smallRadiusResponse)).toEqual([nearCandidate.user.id]);

    const largeRadiusResponse = await explore(requester.token, {
      lat: 0,
      lng: 0,
      radiusKm: 60,
    });

    expect(largeRadiusResponse.status).toBe(200);
    expect(idsFrom(largeRadiusResponse)).toEqual([
      nearCandidate.user.id,
      farCandidate.user.id,
    ]);
  });

  it("uses the saved maxDistanceKm filter on /api/v1/swipes/discover", async () => {
    const requester = await registerUser({
      name: "Discover Requester",
      gender: "man",
      age: 32,
    });

    await updateAccount(requester.token, {
      location: {
        type: "Point",
        coordinates: [10, 10],
      },
    });

    await updateProfile(requester.token, {
      genderPreference: ["woman"],
      minAge: 18,
      maxAge: 60,
      maxDistanceKm: 5,
      expandDistance: false,
    });

    const nearCandidate = await seedCandidate({
      name: "Discover Near",
      gender: "woman",
      age: 28,
      interestedIn: ["man"],
      coordinates: [10.01, 10.01],
    });

    const farCandidate = await seedCandidate({
      name: "Discover Far",
      gender: "woman",
      age: 28,
      interestedIn: ["man"],
      coordinates: [10.3, 10.3],
    });

    const response = await discover(requester.token, { limit: 20 });

    expect(response.status).toBe(200);
    expect(idsFrom(response)).toEqual([nearCandidate.user.id]);
    expect(idsFrom(response)).not.toContain(farCandidate.user.id);
  });

  it("removes already-swiped profiles from the next explore response", async () => {
    const requester = await registerUser({
      name: "Swipe Exclusion Requester",
      gender: "man",
      age: 32,
    });

    await updateProfile(requester.token, {
      genderPreference: ["woman"],
      minAge: 18,
      maxAge: 60,
    });

    const candidate = await seedCandidate({
      name: "Swipe Exclusion Candidate",
      gender: "woman",
      age: 28,
      interestedIn: ["man"],
      coordinates: [0.01, 0.01],
    });

    const beforeSwipe = await explore(requester.token, {
      lat: 0,
      lng: 0,
      radiusKm: 20,
    });

    expect(beforeSwipe.status).toBe(200);
    expect(idsFrom(beforeSwipe)).toContain(candidate.user.id);

    const swipeResponse = await request(app)
      .post("/api/v1/swipes")
      .set("Authorization", `Bearer ${requester.token}`)
      .send({
        targetId: candidate.user.id,
        type: "pass",
      });

    expect(swipeResponse.status).toBe(201);

    const afterSwipe = await explore(requester.token, {
      lat: 0,
      lng: 0,
      radiusKm: 20,
    });

    expect(afterSwipe.status).toBe(200);
    expect(idsFrom(afterSwipe)).not.toContain(candidate.user.id);
  });
});
