const mongoose = require("mongoose");

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
    status: { type: String, enum: ["active", "unmatched"], default: "active" },
    unmatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sentAt: Date,
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

module.exports = mongoose.model("Match", matchSchema);
