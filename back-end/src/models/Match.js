const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
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

matchSchema.index({ users: 1, status: 1 });

module.exports = mongoose.model("Match", matchSchema);
