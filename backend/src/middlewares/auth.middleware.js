const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");
const { userExists } = require("../services/userExistenceCache.service");

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function verifyToken(token) {
  if (!token) {
    throw httpError(401, "Authentication token is required");
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
  } catch (error) {
    throw httpError(401, "Invalid or expired authentication token");
  }
}

const authMiddleware = asyncHandler(async (req, res, next) => {
  const decoded = verifyToken(getBearerToken(req));

  const user = await User.findById(decoded.sub);

  if (!user) {
    return next(httpError(401, "User no longer exists"));
  }

  req.user = user;
  return next();
});

authMiddleware.idOnly = asyncHandler(async (req, res, next) => {
  const decoded = verifyToken(getBearerToken(req));

  if (!(await userExists(decoded.sub))) {
    return next(httpError(401, "User no longer exists"));
  }

  req.user = { _id: new mongoose.Types.ObjectId(decoded.sub) };
  return next();
});

module.exports = authMiddleware;
