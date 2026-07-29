const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller");

const router = express.Router();

router.get("/explore", authMiddleware, userController.explore);
router.put("/profile", authMiddleware, userController.updateProfile);
router.post("/push-token", authMiddleware, userController.savePushToken);
router.delete("/push-token", authMiddleware, userController.revokePushToken);

module.exports = router;
