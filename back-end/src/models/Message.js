const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, maxlength: 2000 },
    imageUrl: String,
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

messageSchema.index({ match: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
