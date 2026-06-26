const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true },
    // unique: true ở đây đã tự động tạo Unique Index rồi
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    birthDate: Date,
    gender: {
      type: String,
      enum: ["woman", "man", "nonbinary", "other"],
      default: "other",
    },
    interestedIn: {
      type: [String],
      enum: ["woman", "man", "nonbinary", "other"],
      default: ["woman", "man", "nonbinary", "other"],
    },
    bio: { type: String, maxlength: 500, default: "" },
    interests: [{ type: String, trim: true, maxlength: 40 }],
    jobTitle: { type: String, trim: true, maxlength: 80 },
    school: { type: String, trim: true, maxlength: 120 },
    photos: { type: [photoSchema], default: [] },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    preferences: {
      maxDistanceKm: { type: Number, default: 50, min: 1, max: 500 },
      ageRange: {
        min: { type: Number, default: 18, min: 18, max: 100 },
        max: { type: Number, default: 60, min: 18, max: 100 },
      },
    },
    isVerified: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Giữ lại index cho tọa độ để query tìm kiếm vị trí xung quanh (App Tinder)
userSchema.index({ location: "2dsphere" });

// ❌ ĐÃ XÓA DÒNG KHAI BÁO INDEX EMAIL TRÙNG LẶP Ở ĐÂY

userSchema.virtual("age").get(function getAge() {
  if (!this.birthDate) return null;
  const diff = Date.now() - this.birthDate.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toProfileJSON = function toProfileJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    age: this.age,
    gender: this.gender,
    interestedIn: this.interestedIn,
    bio: this.bio,
    interests: this.interests,
    jobTitle: this.jobTitle,
    school: this.school,
    photos: this.photos,
    location: this.location,
    preferences: this.preferences,
    isVerified: this.isVerified,
    lastActive: this.lastActive,
  };
};

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

module.exports = mongoose.model("User", userSchema);
