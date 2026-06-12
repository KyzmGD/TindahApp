const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw httpError(401, "Authentication token is required");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
  const user = await User.findById(decoded.sub);

  if (!user) {
    throw httpError(401, "User no longer exists");
  }

  req.user = user;
  next();
});

module.exports = authMiddleware;
