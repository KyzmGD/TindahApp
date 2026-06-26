function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceInKm(from, to) {
  if (!from || !to || from.length < 2 || to.length < 2) {
    return null;
  }

  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const earthRadiusKm = 6371;
  const latDistance = toRadians(toLat - fromLat);
  const lngDistance = toRadians(toLng - fromLng);
  const a =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(lngDistance / 2) *
      Math.sin(lngDistance / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusKm * c * 10) / 10;
}

function buildGeoNearStage(user, maxDistanceKm) {
  const coordinates = user.location?.coordinates;

  if (!coordinates || coordinates.length < 2 || coordinates.every((value) => value === 0)) {
    return null;
  }

  return {
    $geoNear: {
      near: { type: "Point", coordinates },
      distanceField: "distanceMeters",
      maxDistance: (maxDistanceKm || 50) * 1000,
      spherical: true,
    },
  };
}

module.exports = {
  distanceInKm,
  buildGeoNearStage,
};
