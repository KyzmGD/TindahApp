const express = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const aiFilterMiddleware = require("../middlewares/ai_filter.middleware");

const router = express.Router();

router.post("/register", aiFilterMiddleware, authController.register);
router.post("/login", authController.login);
router.get("/me", authMiddleware, authController.getMe);
router.patch("/me", authMiddleware, aiFilterMiddleware, authController.updateMe);

module.exports = router;
