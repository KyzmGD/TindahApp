const express = require("express");
const multer = require("multer");
const asyncHandler = require("../utils/asyncHandler");
const authMiddleware = require("../middlewares/auth.middleware");
const { uploadImageToCloudinary } = require("../utils/cloudinary");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
console.log("HEADERS:", req.headers["content-type"]);
console.log("FILE:", req.file);
console.log("BODY:", req.body);
router.post(
  "/image",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const url = await uploadImageToCloudinary(req.file.buffer, "tinder-app");

    return res.status(200).json({
      message: "Image uploaded successfully",
      url,
    });
  }),
);

router.post(
  "/save-profile-photo",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { url, publicId } = req.body;

    if (!url) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    req.user.photos = [
      ...(req.user.photos || []),
      {
        url,
        publicId: publicId || null,
        isPrimary: req.user.photos?.length === 0,
      },
    ];

    await req.user.save();

    return res.status(200).json({
      message: "Profile photo saved successfully",
      photos: req.user.photos,
    });
  }),
);

module.exports = router;
