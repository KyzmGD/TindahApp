const express = require("express");
const swipeController = require("../controllers/swipe.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/discover", authMiddleware, swipeController.discover);
router.post("/", authMiddleware, swipeController.swipe);

module.exports = router;
