const mongoose = require("mongoose");
const {
  GAME_NAMES,
  LOBBY_GROUPS,
} = require("../services/gamingLobby.service");

const gamerTeamMatchSchema = new mongoose.Schema(
  {
    recruitment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GamerRecruitment",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joiner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    users: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
      validate: {
        validator(users) {
          return users.length === 2;
        },
        message: "A gamer team match must contain exactly two users.",
      },
    },
    participantsKey: {
      type: String,
      required: true,
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
      enum: [2, 4],
      required: true,
    },
    playMode: {
      type: String,
      enum: ["ranked", "casual"],
      required: true,
    },
    lobbyCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 6,
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
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
    matchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

gamerTeamMatchSchema.pre("validate", function setDerivedFields() {
  if (this.owner && this.joiner) {
    this.users = [this.owner, this.joiner];
    this.participantsKey = [this.owner.toString(), this.joiner.toString()].sort().join(":");
  }
});

gamerTeamMatchSchema.index({ recruitment: 1, joiner: 1 }, { unique: true });
gamerTeamMatchSchema.index({ users: 1, status: 1 });
gamerTeamMatchSchema.index({ participantsKey: 1, gameName: 1, status: 1 });

module.exports = mongoose.model("GamerTeamMatch", gamerTeamMatchSchema);
