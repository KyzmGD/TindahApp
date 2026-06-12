const express = require("express");
const matchController = require("../controllers/match.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, matchController.getMatches);
router.patch("/:matchId/unmatch", authMiddleware, matchController.unmatch);

module.exports = router;
