const httpError = require("../utils/httpError");

const blockedTerms = [
  "bank transfer",
  "wire money",
  "crypto giveaway",
  "send gift card",
];

function aiFilterMiddleware(req, res, next) {
  const text = [req.body?.text, req.body?.bio].filter(Boolean).join(" ").toLowerCase();
  const matchedTerm = blockedTerms.find((term) => text.includes(term));

  if (matchedTerm) {
    return next(httpError(422, "Message looks unsafe and needs review", { matchedTerm }));
  }

  return next();
}

module.exports = aiFilterMiddleware;
