const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next(httpError(401, "Authentication token is required"));
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
  } catch (error) {
    return next(httpError(401, "Invalid or expired authentication token"));
  }

  const user = await User.findById(decoded.sub);

  if (!user) {
    return next(httpError(401, "User no longer exists"));
  }

  req.user = user;
  return next();
});

module.exports = authMiddleware;
