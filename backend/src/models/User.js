const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const {
  GAME_NAMES,
  LOBBY_GROUPS,
  getLobbyGroupForRank,
} = require("../services/gamingLobby.service");

const photoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);

const profileDetailsSchema = new mongoose.Schema(
  {
    looking: { type: String, trim: true, maxlength: 80, default: "" },
    languages: [{ type: String, trim: true, maxlength: 40 }],
    zodiac: { type: String, trim: true, maxlength: 40, default: "" },
    education: { type: String, trim: true, maxlength: 80, default: "" },
    family: { type: String, trim: true, maxlength: 80, default: "" },
    communication: { type: String, trim: true, maxlength: 80, default: "" },
    love: { type: String, trim: true, maxlength: 80, default: "" },
    pets: [{ type: String, trim: true, maxlength: 40 }],
    drinking: { type: String, trim: true, maxlength: 80, default: "" },
    smoking: { type: String, trim: true, maxlength: 80, default: "" },
    workout: { type: String, trim: true, maxlength: 80, default: "" },
    social: { type: String, trim: true, maxlength: 80, default: "" },
  },
  { _id: false },
);

const advancedSearchFiltersSchema = new mongoose.Schema(
  {
    interests: [{ type: String, trim: true, maxlength: 40 }],
    looking: { type: String, trim: true, maxlength: 80, default: "" },
    languages: [{ type: String, trim: true, maxlength: 40 }],
    education: { type: String, trim: true, maxlength: 80, default: "" },
    family: { type: String, trim: true, maxlength: 80, default: "" },
    pets: [{ type: String, trim: true, maxlength: 40 }],
    drinking: { type: String, trim: true, maxlength: 80, default: "" },
    smoking: { type: String, trim: true, maxlength: 80, default: "" },
    workout: { type: String, trim: true, maxlength: 80, default: "" },
  },
  { _id: false },
);

const pushTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, trim: true, maxlength: 512 },
    provider: {
      type: String,
      enum: ["expo", "web"],
      default: "expo",
      required: true,
    },
    platform: {
      type: String,
      enum: ["ios", "android", "web", "unknown"],
      default: "unknown",
    },
    deviceId: { type: String, trim: true, maxlength: 160, default: "" },
    disabled: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
    revokedAt: Date,
  },
  { _id: false },
);

const gamingProfileSchema = new mongoose.Schema(
  {
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
    inGameID: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
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
      required: true,
    },
    interestedIn: {
      type: [String],
      enum: ["woman", "man", "nonbinary", "other"],
      default: ["woman", "man", "nonbinary", "other"],
    },
    bio: { type: String, maxlength: 500, default: "" },
    interests: [{ type: String, trim: true, maxlength: 40 }],
    profileDetails: { type: profileDetailsSchema, default: () => ({}) },
    jobTitle: { type: String, trim: true, maxlength: 80 },
    school: { type: String, trim: true, maxlength: 120 },
    avatarUrl: { type: String, trim: true, default: "" },
    avatarPublicId: { type: String, trim: true, default: "" },
    photos: { type: [photoSchema], default: [] },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    preferences: {
      maxDistanceKm: { type: Number, default: 50, min: 2, max: 100 },
      expandDistance: { type: Boolean, default: true },
      expandAge: { type: Boolean, default: true },
      advancedFilters: { type: advancedSearchFiltersSchema, default: () => ({}) },
      ageRange: {
        min: { type: Number, default: 18, min: 18, max: 100 },
        max: { type: Number, default: 60, min: 18, max: 100 },
      },
    },
    gamingProfiles: {
      type: [gamingProfileSchema],
      default: [],
      validate: {
        validator(profiles) {
          const gameNames = (profiles || []).map((profile) => profile.gameName);
          return new Set(gameNames).size === gameNames.length;
        },
        message: "Only one gaming profile is allowed per game.",
      },
    },
    pushTokens: {
      type: [pushTokenSchema],
      default: [],
      validate: {
        validator(tokens) {
          const activeTokens = (tokens || [])
            .filter((entry) => entry?.token && !entry.disabled)
            .map((entry) => `${entry.provider || "expo"}:${entry.token}`);

          return new Set(activeTokens).size === activeTokens.length;
        },
        message: "Push tokens must be unique per user.",
      },
    },
    isVerified: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

userSchema.index({ location: "2dsphere" });
userSchema.index({ "gamingProfiles.gameName": 1, "gamingProfiles.lobbyGroup": 1 });

userSchema.pre("validate", function setGamingLobbyGroups() {
  if (Array.isArray(this.gamingProfiles)) {
    this.gamingProfiles.forEach((profile) => {
      const lobbyGroup = getLobbyGroupForRank(profile.gameName, profile.currentRank);

      if (lobbyGroup) {
        profile.lobbyGroup = lobbyGroup;
      }
    });
  }
});

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
    profileDetails: this.profileDetails,
    jobTitle: this.jobTitle,
    school: this.school,
    avatarUrl: this.avatarUrl,
    avatarPublicId: this.avatarPublicId,
    photos: this.photos,
    gamingProfiles: this.gamingProfiles,
    location: this.location,
    preferences: this.preferences,
    isVerified: this.isVerified,
    isOnline: this.isOnline,
    lastActive: this.lastActive,
  };
};

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

module.exports = mongoose.model("User", userSchema);
