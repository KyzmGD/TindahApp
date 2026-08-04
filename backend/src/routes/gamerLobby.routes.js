const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const gamerLobbyController = require("../controllers/gamerLobby.controller");

const router = express.Router();

router.get("/explore", authMiddleware, gamerLobbyController.explore);
router.get("/recruitments", authMiddleware, gamerLobbyController.getRecruitments);
router.post("/recruitments", authMiddleware, gamerLobbyController.postRecruitment);
router.patch(
  "/recruitments/:recruitmentId/close",
  authMiddleware,
  gamerLobbyController.closeRecruitmentPost,
);
router.post(
  "/recruitments/:recruitmentId/join",
  authMiddleware,
  gamerLobbyController.joinRecruitmentPost,
);

module.exports = router;
