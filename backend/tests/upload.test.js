jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
    },
  },
}));

const cloudinary = require("cloudinary");
const fs = require("fs/promises");
const path = require("path");
const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");

const LOCAL_UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads");

async function registerUser(overrides = {}) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Upload User",
      email: `upload-${Date.now()}-${Math.random()}@example.com`,
      password: "password123",
      birthDate: "1998-01-01",
      gender: "other",
      ...overrides,
    });

  expect(response.status).toBe(201);
  return {
    token: response.body.token,
    user: response.body.user,
  };
}

describe("profile image upload routes", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "12345";
    process.env.CLOUDINARY_API_SECRET = "secret";
    process.env.PUBLIC_BASE_URL = "http://localhost:5000";
    await fs.rm(LOCAL_UPLOAD_DIR, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(LOCAL_UPLOAD_DIR, { recursive: true, force: true });
  });

  it("rejects upload requests without an image file", async () => {
    const user = await registerUser();

    const response = await request(app)
      .post("/api/v1/upload/image")
      .set("Authorization", `Bearer ${user.token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Image file is required");
  });

  it("rejects unsupported multipart file types", async () => {
    const user = await registerUser();

    const response = await request(app)
      .post("/api/v1/upload/image")
      .set("Authorization", `Bearer ${user.token}`)
      .attach("image", Buffer.from("not-an-image"), {
        filename: "profile.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Only JPG, PNG, and WEBP images are allowed");
    expect(cloudinary.v2.uploader.upload).not.toHaveBeenCalled();
  });

  it("uploads an image and returns a static URL with publicId", async () => {
    const user = await registerUser();
    cloudinary.v2.uploader.upload.mockImplementation((value, options, callback) => {
      callback(null, {
        secure_url: "https://res.cloudinary.com/demo/image/upload/v123/profile.jpg",
        public_id: "tinder-app/profile",
      });
    });

    const response = await request(app)
      .post("/api/v1/upload/image")
      .set("Authorization", `Bearer ${user.token}`)
      .attach("image", Buffer.from([0xff, 0xd8, 0xff, 0x00]), {
        filename: "profile.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Image uploaded successfully",
      url: "https://res.cloudinary.com/demo/image/upload/v123/profile.jpg",
      publicId: "tinder-app/profile",
      storage: "cloudinary",
    });
    expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^data:image\/jpeg;base64,/),
      { folder: "tinder-app", resource_type: "image" },
      expect.any(Function),
    );
  });

  it("falls back to local static uploads when Cloudinary is not configured", async () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    const user = await registerUser();

    const response = await request(app)
      .post("/api/v1/upload/image")
      .set("Authorization", `Bearer ${user.token}`)
      .attach("image", Buffer.from([0xff, 0xd8, 0xff, 0x00]), {
        filename: "profile.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: "Image uploaded successfully",
      publicId: expect.stringMatching(/^local\/uploads\/profile-/),
      storage: "local",
      url: expect.stringMatching(/^http:\/\/localhost:5000\/uploads\/profile-/),
    });
    expect(cloudinary.v2.uploader.upload).not.toHaveBeenCalled();

    const uploadedFiles = await fs.readdir(LOCAL_UPLOAD_DIR);
    expect(uploadedFiles).toHaveLength(1);
  });

  it("saves a profile photo without leaking raw user internals", async () => {
    const user = await registerUser();

    const response = await request(app)
      .post("/api/v1/upload/save-profile-photo")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        url: "https://res.cloudinary.com/demo/image/upload/v123/profile.jpg",
        publicId: "tinder-app/profile",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Profile photo saved successfully");
    expect(response.body.photos).toHaveLength(1);
    expect(response.body.photos[0]).toMatchObject({
      url: "https://res.cloudinary.com/demo/image/upload/v123/profile.jpg",
      publicId: "tinder-app/profile",
      isPrimary: true,
    });
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.body.user.pushTokens).toBeUndefined();

    const storedUser = await User.findById(user.user.id).lean();
    expect(storedUser.photos).toHaveLength(1);
    expect(storedUser.photos[0]).toMatchObject({
      url: "https://res.cloudinary.com/demo/image/upload/v123/profile.jpg",
      publicId: "tinder-app/profile",
      isPrimary: true,
    });
  });

  it("saves avatar separately without changing profile photos", async () => {
    const user = await registerUser();
    await User.findByIdAndUpdate(user.user.id, {
      photos: [
        {
          url: "https://example.com/gallery.jpg",
          publicId: "gallery-photo",
          isPrimary: true,
        },
      ],
    });

    const response = await request(app)
      .post("/api/v1/upload/save-avatar")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        url: "https://res.cloudinary.com/demo/image/upload/v123/avatar.jpg",
        publicId: "tinder-app/avatar",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Avatar saved successfully");
    expect(response.body.user.avatarUrl).toBe(
      "https://res.cloudinary.com/demo/image/upload/v123/avatar.jpg",
    );
    expect(response.body.user.photos).toHaveLength(1);
    expect(response.body.user.photos[0].url).toBe("https://example.com/gallery.jpg");

    const storedUser = await User.findById(user.user.id).lean();
    expect(storedUser.avatarUrl).toBe(
      "https://res.cloudinary.com/demo/image/upload/v123/avatar.jpg",
    );
    expect(storedUser.avatarPublicId).toBe("tinder-app/avatar");
    expect(storedUser.photos).toHaveLength(1);
    expect(storedUser.photos[0].url).toBe("https://example.com/gallery.jpg");
  });

  it("prevents saving more than six profile photos", async () => {
    const user = await registerUser();
    await User.findByIdAndUpdate(user.user.id, {
      photos: Array.from({ length: 6 }, (_, index) => ({
        url: `https://example.com/profile-${index}.jpg`,
        isPrimary: index === 0,
      })),
    });

    const response = await request(app)
      .post("/api/v1/upload/save-profile-photo")
      .set("Authorization", `Bearer ${user.token}`)
      .send({
        url: "https://res.cloudinary.com/demo/image/upload/v123/extra.jpg",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Profile can contain at most 6 photos");
  });
});
