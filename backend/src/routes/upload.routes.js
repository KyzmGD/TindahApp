const express = require("express");
const multer = require("multer");
const asyncHandler = require("../utils/asyncHandler");
const authMiddleware = require("../middlewares/auth.middleware");
const {
  hasCloudinaryConfig,
  uploadImageToCloudinary,
} = require("../utils/cloudinary");
const { saveImageToLocalUploads } = require("../utils/localUpload");

const router = express.Router();
const MAX_PROFILE_PHOTOS = 6;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      const error = new Error("Only JPG, PNG, and WEBP images are allowed");
      error.statusCode = 400;
      callback(error);
      return;
    }

    callback(null, true);
  },
});

function uploadSingleProfileImage(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ message: "Image file must be 5MB or smaller" });
      return;
    }

    res.status(error.statusCode || 400).json({
      message: error.message || "Invalid image upload",
    });
  });
}

async function uploadProfileImage(file, req) {
  if (!hasCloudinaryConfig()) {
    return saveImageToLocalUploads(file.buffer, file.mimetype, req);
  }

  try {
    return await uploadImageToCloudinary(
      file.buffer,
      "tinder-app",
      file.mimetype,
    );
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }

    console.warn("Cloudinary upload failed, falling back to local uploads:", error.message);
    return saveImageToLocalUploads(file.buffer, file.mimetype, req);
  }
}

router.post(
  "/image",
  authMiddleware,
  uploadSingleProfileImage,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message: "Image file is required",
      });
    }

    const uploadedImage = await uploadProfileImage(req.file, req);

    return res.status(200).json({
      message: "Image uploaded successfully",
      ...uploadedImage,
    });
  }),
);

router.post(
  "/save-avatar",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { url, publicId } = req.body;
    const normalizedUrl = typeof url === "string" ? url.trim() : "";

    if (!normalizedUrl) {
      return res.status(400).json({
        message: "Avatar URL is required",
      });
    }

    req.user.avatarUrl = normalizedUrl;
    req.user.avatarPublicId = publicId ? String(publicId).trim() : "";

    await req.user.save();

    return res.status(200).json({
      message: "Avatar saved successfully",
      user: req.user.toProfileJSON(),
      avatarUrl: req.user.avatarUrl,
      avatarPublicId: req.user.avatarPublicId,
    });
  }),
);

router.post(
  "/save-profile-photo",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { url, publicId } = req.body;
    const normalizedUrl = typeof url === "string" ? url.trim() : "";

    if (!normalizedUrl) {
      return res.status(400).json({
        message: "Image URL is required",
      });
    }

    if (req.user.photos.length >= MAX_PROFILE_PHOTOS) {
      return res.status(400).json({
        message: `Profile can contain at most ${MAX_PROFILE_PHOTOS} photos`,
      });
    }

    req.user.photos.push({
      url: normalizedUrl,
      publicId: publicId ? String(publicId).trim() : undefined,
      isPrimary: req.user.photos.length === 0,
    });

    await req.user.save();

    return res.status(200).json({
      message: "Profile photo saved successfully",
      user: req.user.toProfileJSON(),
      photos: req.user.photos,
    });
  }),
);

module.exports = router;
