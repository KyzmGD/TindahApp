const mongoose = require("mongoose");

const unreadCountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    count: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const gamerContextSchema = new mongoose.Schema(
  {
    recruitment: { type: mongoose.Schema.Types.ObjectId, ref: "GamerRecruitment" },
    teamMatch: { type: mongoose.Schema.Types.ObjectId, ref: "GamerTeamMatch" },
    gameName: String,
    currentRank: String,
    lobbyGroup: String,
    teamSize: Number,
    playMode: String,
    lobbyCode: String,
    teamName: String,
    description: String,
  },
  { _id: false },
);

const matchSchema = new mongoose.Schema(
  {
    users: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
      validate: {
        validator(users) {
          return users.length === 2;
        },
        message: "A match must contain exactly two users",
      },
    },
    participantsKey: { type: String, required: true },
    source: {
      type: String,
      enum: ["dating", "gamer_lobby", "mixed"],
      default: "dating",
      index: true,
    },
    gamerContext: {
      type: gamerContextSchema,
      default: undefined,
    },
    status: { type: String, enum: ["active", "unmatched"], default: "active" },
    unmatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sentAt: Date,
    },
    unreadCounts: {
      type: [unreadCountSchema],
      default: [],
    },
    matchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

matchSchema.pre("validate", function setParticipantsKey() {
  if (this.users?.length === 2) {
    this.participantsKey = this.users.map((userId) => userId.toString()).sort().join(":");
  }
});

matchSchema.index({ users: 1, status: 1 });
matchSchema.index({ participantsKey: 1 }, { unique: true });
matchSchema.index({ source: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model("Match", matchSchema);
