const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller");

const router = express.Router();

router.get("/explore", authMiddleware, userController.explore);
router.put("/profile", authMiddleware, userController.updateProfile);

module.exports = router;
