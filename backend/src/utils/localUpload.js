const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "uploads");
const EXTENSION_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function getPublicBaseUrl(req) {
  const configuredBaseUrl = process.env.PUBLIC_BASE_URL || process.env.API_PUBLIC_URL;

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

async function saveImageToLocalUploads(buffer, mimeType, req) {
  const extension = EXTENSION_BY_MIME[mimeType] || "jpg";
  const filename = `profile-${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;
  const absolutePath = path.join(UPLOAD_DIR, filename);

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return {
    url: `${getPublicBaseUrl(req)}/uploads/${filename}`,
    publicId: `local/uploads/${filename}`,
    storage: "local",
  };
}

module.exports = {
  saveImageToLocalUploads,
};
