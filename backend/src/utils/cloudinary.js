const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isConfiguredValue(value) {
  return typeof value === "string" && value.trim() && !value.trim().startsWith("your_");
}

function hasCloudinaryConfig() {
  return Boolean(
    isConfiguredValue(process.env.CLOUDINARY_CLOUD_NAME) &&
      isConfiguredValue(process.env.CLOUDINARY_API_KEY) &&
      isConfiguredValue(process.env.CLOUDINARY_API_SECRET),
  );
}

function normalizeUploadInput(input, mimeType = "image/jpeg") {
  if (Buffer.isBuffer(input)) {
    return `data:${mimeType};base64,${input.toString("base64")}`;
  }

  return input;
}

function uploadImageToCloudinary(input, folder, mimeType) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      normalizeUploadInput(input, mimeType),
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          storage: "cloudinary",
        });
      },
    );
  });
}

module.exports = {
  hasCloudinaryConfig,
  uploadImageToCloudinary,
};
