jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
    },
  },
}));

const cloudinary = require("cloudinary");
const { uploadImageToCloudinary } = require("../src/utils/cloudinary");

describe("uploadImageToCloudinary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "12345";
    process.env.CLOUDINARY_API_SECRET = "secret";
  });

  it("uploads image data and returns a Cloudinary URL", async () => {
    cloudinary.v2.uploader.upload.mockImplementation(
      (value, options, callback) => {
        callback(null, {
          secure_url:
            "https://res.cloudinary.com/demo/image/upload/v123/sample.jpg",
          public_id: "tinder-app/sample",
        });
      },
    );

    const result = await uploadImageToCloudinary(
      "data:image/jpeg;base64,abc123",
      "tinder-app",
    );

    expect(result).toEqual({
      url: "https://res.cloudinary.com/demo/image/upload/v123/sample.jpg",
      publicId: "tinder-app/sample",
      storage: "cloudinary",
    });
    expect(cloudinary.v2.uploader.upload).toHaveBeenCalled();
  });

  it("converts a Buffer upload into a Cloudinary-compatible data URL", async () => {
    cloudinary.v2.uploader.upload.mockImplementation(
      (value, options, callback) => {
        callback(null, {
          secure_url:
            "https://res.cloudinary.com/demo/image/upload/v123/buffer-image.jpg",
          public_id: "tinder-app/buffer-image",
        });
      },
    );

    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
    const result = await uploadImageToCloudinary(jpegBuffer, "tinder-app");

    expect(result).toEqual({
      url: "https://res.cloudinary.com/demo/image/upload/v123/buffer-image.jpg",
      publicId: "tinder-app/buffer-image",
      storage: "cloudinary",
    });
    expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^data:image\/jpeg;base64,/),
      { folder: "tinder-app", resource_type: "image" },
      expect.any(Function),
    );
  });
});
