const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { hasValidationErrors, validateLoginPayload, validateRegisterPayload } = require("../utils/authValidation");
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
  const validationErrors = validateRegisterPayload(req.body);

  if (hasValidationErrors(validationErrors)) {
    throw httpError(400, "Please fix the highlighted fields.", validationErrors);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw httpError(409, "Email is already registered", { email: "Email is already registered." });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    birthDate: new Date(`${birthDate}T00:00:00.000Z`),
    gender,
  });

  res.status(201).json({
    token: signToken(user),
    user: user.toProfileJSON(),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const validationErrors = validateLoginPayload(req.body);

  if (hasValidationErrors(validationErrors)) {
    throw httpError(400, "Please fix the highlighted fields.", validationErrors);
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
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
