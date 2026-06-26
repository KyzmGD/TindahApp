const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, birthDate, gender } = req.body;

  if (!name || !email || !password) {
    throw httpError(400, "Name, email and password are required");
  }

  if (password.length < 8) {
    throw httpError(400, "Password must be at least 8 characters");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw httpError(409, "Email is already registered");
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    email,
    passwordHash,
    birthDate,
    gender,
  });

  res.status(201).json({
    token: signToken(user),
    user: user.toProfileJSON(),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw httpError(400, "Email and password are required");
  }

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await user.comparePassword(password))) {
    throw httpError(401, "Invalid email or password");
  }

  user.lastActive = new Date();
  await user.save();

  res.json({
    token: signToken(user),
    user: user.toProfileJSON(),
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toProfileJSON() });
});

const updateMe = asyncHandler(async (req, res) => {
  const allowedFields = [
    "name",
    "birthDate",
    "gender",
    "interestedIn",
    "bio",
    "interests",
    "jobTitle",
    "school",
    "photos",
    "location",
    "preferences",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      req.user[field] = req.body[field];
    }
  });

  await req.user.save();
  res.json({ user: req.user.toProfileJSON() });
});

module.exports = {
  register,
  login,
  getMe,
  updateMe,
};
