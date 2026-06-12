const Match = require("../models/Match");
const { listMatches } = require("../services/matching.service");
const asyncHandler = require("../utils/asyncHandler");
const httpError = require("../utils/httpError");

const getMatches = asyncHandler(async (req, res) => {
  const matches = await listMatches(req.user._id);
  res.json({ matches });
});

const unmatch = asyncHandler(async (req, res) => {
  const match = await Match.findOne({ _id: req.params.matchId, users: req.user._id, status: "active" });

  if (!match) {
    throw httpError(404, "Match not found");
  }

  match.status = "unmatched";
  match.unmatchedBy = req.user._id;
  await match.save();

  res.json({ match });
});

module.exports = {
  getMatches,
  unmatch,
};
