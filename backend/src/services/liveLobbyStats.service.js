const GamerRecruitment = require("../models/GamerRecruitment");
const User = require("../models/User");

async function getLiveLobbyStats() {
  const [onlineGamers, activeParties] = await Promise.all([
    User.countDocuments({ isOnline: true }),
    GamerRecruitment.countDocuments({ status: "open" }),
  ]);

  return {
    onlineGamers,
    activeParties,
    updatedAt: new Date().toISOString(),
  };
}

async function emitLiveLobbyStats(io) {
  if (!io || typeof io.emit !== "function") return null;
  const stats = await getLiveLobbyStats();
  io.emit("live_lobby:stats", stats);
  return stats;
}

module.exports = {
  emitLiveLobbyStats,
  getLiveLobbyStats,
};
