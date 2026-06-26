const mongoose = require("mongoose");

const swipeSchema = new mongoose.Schema(
  {
    swiper: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    target: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    direction: { type: String, enum: ["like", "nope", "superlike"], required: true },
  },
  { timestamps: true },
);

swipeSchema.index({ swiper: 1, target: 1 }, { unique: true });
swipeSchema.index({ target: 1, direction: 1 });

module.exports = mongoose.model("Swipe", swipeSchema);
