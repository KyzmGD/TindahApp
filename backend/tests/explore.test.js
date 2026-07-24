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

describe("GET /api/v1/users/explore", () => {
  beforeAll(async () => {
    await User.init();
  });

  it("returns nearby users and excludes the requester", async () => {
    const requester = await User.create({
      name: "Requester",
      email: "requester@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(28),
      gender: "man",
      location: {
        type: "Point",
        coordinates: [0, 0],
      },
    });

    await User.create({
      name: "Near User",
      email: "near@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(27),
      gender: "woman",
      location: {
        type: "Point",
        coordinates: [0.01, 0.01],
      },
    });

    await User.create({
      name: "Far User",
      email: "far@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(27),
      gender: "woman",
      location: {
        type: "Point",
        coordinates: [2, 2],
      },
    });

    const token = signUserToken(requester);

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

  it("applies stored gender and age filters to explore candidates", async () => {
    const requester = await User.create({
      name: "Filtered Requester",
      email: "filtered-requester@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(29),
      gender: "man",
      interestedIn: ["woman"],
      preferences: {
        ageRange: {
          min: 25,
          max: 35,
        },
      },
      location: {
        type: "Point",
        coordinates: [0, 0],
      },
    });

    const matchingCandidate = await User.create({
      name: "Matching Candidate",
      email: "matching-candidate@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(30),
      gender: "woman",
      location: {
        type: "Point",
        coordinates: [0.01, 0.01],
      },
    });

    await User.create({
      name: "Wrong Gender",
      email: "wrong-gender@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(30),
      gender: "man",
      location: {
        type: "Point",
        coordinates: [0.01, 0.01],
      },
    });

    await User.create({
      name: "Too Young",
      email: "too-young@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(20),
      gender: "woman",
      location: {
        type: "Point",
        coordinates: [0.01, 0.01],
      },
    });

    await User.create({
      name: "Too Old",
      email: "too-old@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(45),
      gender: "woman",
      location: {
        type: "Point",
        coordinates: [0.01, 0.01],
      },
    });

    const response = await request(app)
      .get("/api/v1/users/explore")
      .set("Authorization", `Bearer ${signUserToken(requester)}`)
      .query({ lat: 0, lng: 0, radiusKm: 20 });

    expect(response.status).toBe(200);
    expect(response.body.users.map((user) => user.id)).toEqual([
      matchingCandidate._id.toString(),
    ]);
    expect(response.body.users[0]).toMatchObject({
      name: "Matching Candidate",
      gender: "woman",
      age: 30,
    });
  });

  it("keeps /users/explore and /swipes/discover on the same discovery filters", async () => {
    const requester = await User.create({
      name: "Synced Requester",
      email: "synced-requester@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(29),
      gender: "man",
      interestedIn: ["woman"],
      preferences: {
        maxDistanceKm: 50,
        ageRange: {
          min: 25,
          max: 35,
        },
      },
      location: {
        type: "Point",
        coordinates: [0, 0],
      },
    });

    const mutualCandidate = await User.create({
      name: "Mutual Candidate",
      email: "mutual-candidate@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(30),
      gender: "woman",
      interestedIn: ["man"],
      location: {
        type: "Point",
        coordinates: [0.01, 0.01],
      },
    });

    await User.create({
      name: "One Way Candidate",
      email: "one-way-candidate@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(30),
      gender: "woman",
      interestedIn: ["woman"],
      location: {
        type: "Point",
        coordinates: [0.01, 0.01],
      },
    });

    const token = signUserToken(requester);
    const usersExploreResponse = await request(app)
      .get("/api/v1/users/explore")
      .set("Authorization", `Bearer ${token}`)
      .query({ lat: 0, lng: 0, radiusKm: 20 });

    const swipeDiscoverResponse = await request(app)
      .get("/api/v1/swipes/discover")
      .set("Authorization", `Bearer ${token}`)
      .query({ limit: 20 });

    expect(usersExploreResponse.status).toBe(200);
    expect(swipeDiscoverResponse.status).toBe(200);

    expect(usersExploreResponse.body.users.map((user) => user.id)).toEqual([
      mutualCandidate._id.toString(),
    ]);
    expect(swipeDiscoverResponse.body.users.map((user) => user.id)).toEqual([
      mutualCandidate._id.toString(),
    ]);
  });
});

describe("PUT /api/v1/users/profile", () => {
  it("updates profile fields and returns the current user profile", async () => {
    const user = await User.create({
      name: "Profile User",
      email: "profile-user@example.com",
      passwordHash: "hashed-password",
      birthDate: new Date("1998-01-01T00:00:00.000Z"),
      gender: "woman",
    });
    const token = signUserToken(user);

    const response = await request(app)
      .put("/api/v1/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated Profile",
        bio: "Coffee and weekend walks",
        jobTitle: "Product Designer",
        school: "Tinder University",
        birthDate: "1997-06-15",
        interests: ["coffee", "travel", "coffee"],
        genderPreference: ["man", "nonbinary"],
        minAge: 24,
        maxAge: 36,
        maxDistanceKm: 72,
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Profile updated successfully");
    expect(response.body.user).toMatchObject({
      id: user._id.toString(),
      name: "Updated Profile",
      bio: "Coffee and weekend walks",
      jobTitle: "Product Designer",
      school: "Tinder University",
      interests: ["coffee", "travel"],
      interestedIn: ["man", "nonbinary"],
      genderPreference: ["man", "nonbinary"],
      minAge: 24,
      maxAge: 36,
      maxDistanceKm: 72,
      preferences: {
        maxDistanceKm: 72,
        ageRange: {
          min: 24,
          max: 36,
        },
      },
      searchFilters: {
        genderPreference: ["man", "nonbinary"],
        minAge: 24,
        maxAge: 36,
        maxDistanceKm: 72,
      },
    });

    const storedUser = await User.findById(user._id).lean();
    expect(storedUser).toMatchObject({
      name: "Updated Profile",
      bio: "Coffee and weekend walks",
      jobTitle: "Product Designer",
      school: "Tinder University",
      interests: ["coffee", "travel"],
      interestedIn: ["man", "nonbinary"],
    });
    expect(storedUser.birthDate.toISOString()).toBe("1997-06-15T00:00:00.000Z");
    expect(storedUser.preferences.ageRange).toMatchObject({
      min: 24,
      max: 36,
    });
    expect(storedUser.preferences.maxDistanceKm).toBe(72);
  });

  it("syncs settings distance and reordered profile photos", async () => {
    const user = await User.create({
      name: "Photo Settings User",
      email: "photo-settings-user@example.com",
      passwordHash: "hashed-password",
      birthDate: new Date("1998-01-01T00:00:00.000Z"),
      gender: "woman",
      photos: [
        { url: "https://example.com/old-primary.jpg", publicId: "old-primary", isPrimary: true },
        { url: "https://example.com/old-second.jpg", publicId: "old-second", isPrimary: false },
      ],
      preferences: {
        maxDistanceKm: 50,
        ageRange: {
          min: 21,
          max: 40,
        },
      },
    });
    const token = signUserToken(user);

    const response = await request(app)
      .put("/api/v1/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        maxDistanceKm: 88,
        photos: [
          { url: "https://example.com/photo-3.jpg", publicId: "photo-3" },
          { url: "https://example.com/photo-1.jpg", publicId: "photo-1", isPrimary: true },
          { url: "https://example.com/photo-2.jpg", publicId: "photo-2" },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      maxDistanceKm: 88,
      preferences: {
        maxDistanceKm: 88,
        ageRange: {
          min: 21,
          max: 40,
        },
      },
      searchFilters: {
        maxDistanceKm: 88,
      },
    });
    expect(response.body.user.photos.map((photo) => photo.url)).toEqual([
      "https://example.com/photo-3.jpg",
      "https://example.com/photo-1.jpg",
      "https://example.com/photo-2.jpg",
    ]);
    expect(response.body.user.photos.map((photo) => photo.isPrimary)).toEqual([
      true,
      false,
      false,
    ]);

    const storedUser = await User.findById(user._id).lean();
    expect(storedUser.preferences.maxDistanceKm).toBe(88);
    expect(storedUser.photos.map((photo) => photo.url)).toEqual([
      "https://example.com/photo-3.jpg",
      "https://example.com/photo-1.jpg",
      "https://example.com/photo-2.jpg",
    ]);
    expect(storedUser.photos.map((photo) => photo.isPrimary)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it("maps profile API aliases into the existing user schema", async () => {
    const user = await User.create({
      name: "Alias User",
      email: "alias-user@example.com",
      passwordHash: "hashed-password",
      birthDate: new Date("1990-01-01T00:00:00.000Z"),
      gender: "man",
    });
    const token = signUserToken(user);

    const response = await request(app)
      .put("/api/v1/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        age: 30,
        interests: "hiking, music, hiking",
        genderPreference: "woman",
        preferences: {
          ageRange: {
            min: "21",
            max: "33",
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      age: 30,
      interests: ["hiking", "music"],
      interestedIn: ["woman"],
      genderPreference: ["woman"],
      minAge: 21,
      maxAge: 33,
      preferences: {
        ageRange: {
          min: 21,
          max: 33,
        },
      },
      searchFilters: {
        genderPreference: ["woman"],
        minAge: 21,
        maxAge: 33,
      },
    });

    const storedUser = await User.findById(user._id).lean();
    const expectedBirthYear = new Date().getFullYear() - 30;
    expect(storedUser.birthDate.getFullYear()).toBe(expectedBirthYear);
    expect(storedUser.interests).toEqual(["hiking", "music"]);
    expect(storedUser.interestedIn).toEqual(["woman"]);
    expect(storedUser.preferences.ageRange).toMatchObject({
      min: 21,
      max: 33,
    });
  });

  it("rejects invalid profile and filter payloads before saving", async () => {
    const user = await User.create({
      name: "Invalid Payload User",
      email: "invalid-payload-user@example.com",
      passwordHash: "hashed-password",
      birthDate: new Date("1990-01-01T00:00:00.000Z"),
      gender: "woman",
      bio: "Original bio",
      interests: ["original"],
      interestedIn: ["man"],
      preferences: {
        maxDistanceKm: 50,
        ageRange: {
          min: 25,
          max: 35,
        },
      },
    });
    const token = signUserToken(user);

    const response = await request(app)
      .put("/api/v1/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "A",
        bio: "x".repeat(501),
        birthDate: "2020-01-01",
        interests: ["valid", "x".repeat(41)],
        genderPreference: ["invalid"],
        minAge: 40,
        maxAge: 30,
        maxDistanceKm: 101,
        photos: Array.from({ length: 7 }, (_, index) => ({
          url: `https://example.com/photo-${index}.jpg`,
        })),
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Please fix the highlighted fields.");
    expect(response.body.details).toMatchObject({
      name: "Name must be at least 2 characters.",
      bio: "Bio must be 500 characters or less.",
      birthDate: "You must be at least 18 years old.",
      interests: "Each interest must be 40 characters or less.",
      genderPreference: "Select a valid gender preference.",
      ageRange: "minAge must be less than or equal to maxAge.",
      maxDistanceKm: "maxDistanceKm must be between 2 and 100.",
      photos: "Profile can contain at most 6 photos.",
    });

    const storedUser = await User.findById(user._id).lean();
    expect(storedUser).toMatchObject({
      name: "Invalid Payload User",
      bio: "Original bio",
      interests: ["original"],
      interestedIn: ["man"],
    });
    expect(storedUser.preferences.ageRange).toMatchObject({
      min: 25,
      max: 35,
    });
    expect(storedUser.preferences.maxDistanceKm).toBe(50);
  });

  it("applies updated search filters to the next explore request immediately", async () => {
    const requester = await User.create({
      name: "Immediate Filter User",
      email: "immediate-filter-user@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(29),
      gender: "man",
      interestedIn: ["woman", "man", "nonbinary", "other"],
      preferences: {
        maxDistanceKm: 50,
        ageRange: {
          min: 18,
          max: 60,
        },
      },
      location: {
        type: "Point",
        coordinates: [0, 0],
      },
    });

    const matchingCandidate = await User.create({
      name: "Immediate Match",
      email: "immediate-match@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(31),
      gender: "woman",
      interestedIn: ["man"],
      location: {
        type: "Point",
        coordinates: [0.01, 0.01],
      },
    });

    await User.create({
      name: "Immediate Wrong Gender",
      email: "immediate-wrong-gender@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(31),
      gender: "man",
      interestedIn: ["man"],
      location: {
        type: "Point",
        coordinates: [0.01, 0.01],
      },
    });

    await User.create({
      name: "Immediate Wrong Age",
      email: "immediate-wrong-age@example.com",
      passwordHash: "hashed-password",
      birthDate: birthDateForAge(22),
      gender: "woman",
      interestedIn: ["man"],
      location: {
        type: "Point",
        coordinates: [0.01, 0.01],
      },
    });

    const token = signUserToken(requester);

    const updateResponse = await request(app)
      .put("/api/v1/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        genderPreference: ["woman"],
        minAge: 30,
        maxAge: 35,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.user.searchFilters).toMatchObject({
      genderPreference: ["woman"],
      minAge: 30,
      maxAge: 35,
    });

    const exploreResponse = await request(app)
      .get("/api/v1/users/explore")
      .set("Authorization", `Bearer ${token}`)
      .query({ lat: 0, lng: 0, radiusKm: 20 });

    expect(exploreResponse.status).toBe(200);
    expect(exploreResponse.body.users.map((user) => user.id)).toEqual([
      matchingCandidate._id.toString(),
    ]);
  });
});
