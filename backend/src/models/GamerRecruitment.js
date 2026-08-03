const mongoose = require("mongoose");
const {
  GAME_NAMES,
  LOBBY_GROUPS,
  getLobbyGroupForRank,
} = require("../services/gamingLobby.service");

const TEAM_SIZES = [2, 4];
const PLAY_MODES = ["ranked", "casual"];

const gamerRecruitmentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gameName: {
      type: String,
      enum: GAME_NAMES,
      required: true,
    },
    currentRank: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    lobbyGroup: {
      type: String,
      enum: LOBBY_GROUPS,
      required: true,
    },
    teamSize: {
      type: Number,
      enum: TEAM_SIZES,
      required: true,
    },
    members: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
      default: [],
    },
    memberCount: {
      type: Number,
      min: 1,
      default: 1,
    },
    playMode: {
      type: String,
      enum: PLAY_MODES,
      required: true,
    },
    lobbyCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 6,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true },
);

gamerRecruitmentSchema.index({
  gameName: 1,
  lobbyGroup: 1,
  status: 1,
  createdAt: -1,
});
gamerRecruitmentSchema.index({ status: 1, memberCount: 1, teamSize: 1 });

gamerRecruitmentSchema.pre("validate", function setLobbyGroup() {
  const lobbyGroup = getLobbyGroupForRank(this.gameName, this.currentRank);

  if (lobbyGroup) {
    this.lobbyGroup = lobbyGroup;
  }

  if (this.owner && !this.members?.length) {
    this.members = [this.owner];
  }

  this.memberCount = Math.max(1, this.members?.length || 1);

  if (this.teamSize && this.memberCount >= this.teamSize) {
    this.status = "closed";
  }
});

module.exports = mongoose.model("GamerRecruitment", gamerRecruitmentSchema);
module.exports.TEAM_SIZES = TEAM_SIZES;
module.exports.PLAY_MODES = PLAY_MODES;
