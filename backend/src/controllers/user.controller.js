const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const User = require("../models/User");
const { getExcludedSwipeIds } = require("../services/swipeCache.service");

const explore = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radiusKm || 50);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({
      message: "lat and lng query parameters are required and must be numbers",
    });
  }

  const radiusMeters = Math.max(1000, radiusKm * 1000);

  try {
    const excludedSwipeIds = await getExcludedSwipeIds(req.user._id);
    const excludedObjectIds = excludedSwipeIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const users = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },
          distanceField: "distanceMeters",
          maxDistance: radiusMeters,
          spherical: true,
        },
      },
      {
        $match: {
          _id: { $nin: [req.user._id, ...excludedObjectIds] },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          bio: 1,
          photos: 1,
          location: 1,
          distanceMeters: 1,
          distanceKm: {
            $divide: ["$distanceMeters", 1000],
          },
        },
      },
      {
        $sort: { distanceMeters: 1 },
      },
    ]);

    const mappedUsers = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      bio: user.bio,
      photos: user.photos,
      location: user.location,
      distanceMeters: Math.round(user.distanceMeters),
      distanceKm: Number(user.distanceKm.toFixed(2)),
    }));

    return res.json({ users: mappedUsers });
  } catch (error) {
    console.error("Explore error:", error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = {
  explore,
};
