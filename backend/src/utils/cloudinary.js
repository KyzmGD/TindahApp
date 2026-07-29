const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result.secure_url);
      },
    );
  });
}

module.exports = {
  uploadImageToCloudinary,
};
