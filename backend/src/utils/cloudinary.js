const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadImageToCloudinary(
  fileBufferOrDataUrl,
  folder = "tinder-app",
) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary environment variables are not configured");
  }

  const uploadInput =
    fileBufferOrDataUrl instanceof Buffer
      ? `data:${detectMimeType(fileBufferOrDataUrl)};base64,${fileBufferOrDataUrl.toString("base64")}`
      : fileBufferOrDataUrl;

  const uploadResult = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload(uploadInput, { folder }, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });

  return uploadResult.secure_url;
}

function detectMimeType(buffer) {
  if (buffer.subarray(0, 3).toString("hex") === "89504e") {
    return "image/png";
  }

  if (buffer.subarray(0, 2).toString("hex") === "ffd8") {
    return "image/jpeg";
  }

  if (buffer.subarray(0, 4).toString("hex") === "474946") {
    return "image/gif";
  }

  return "application/octet-stream";
}

module.exports = {
  uploadImageToCloudinary,
};
