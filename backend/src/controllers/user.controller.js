const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const User = require("../models/User");
const { getExcludedSwipeIds } = require("../services/swipeCache.service");
const {
  buildDiscoveryMatchStage,
  formatDiscoveryCandidate,
} = require("../services/matching.service");
const httpError = require("../utils/httpError");

const ALLOWED_GENDERS = ["woman", "man", "nonbinary", "other"];
const BIRTHDAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_ALLOWED_AGE = 18;
const MAX_ALLOWED_AGE = 100;
const MIN_DISTANCE_KM = 2;
const MAX_DISTANCE_KM = 100;
const MAX_PROFILE_PHOTOS = 6;
const PROFILE_DETAIL_ARRAY_FIELDS = ["languages", "pets"];
const PROFILE_DETAIL_STRING_FIELDS = [
  "looking",
  "zodiac",
  "education",
  "family",
  "communication",
  "love",
  "drinking",
  "smoking",
  "workout",
  "social",
];
const ADVANCED_FILTER_ARRAY_FIELDS = ["interests", "languages", "pets"];
const ADVANCED_FILTER_STRING_FIELDS = [
  "looking",
  "education",
  "family",
  "drinking",
  "smoking",
  "workout",
];

function getAgeFromBirthDateString(birthDate) {
  const birthday = new Date(`${birthDate}T00:00:00.000Z`);
  const [year, month, day] = birthDate.split("-").map(Number);
  const today = new Date();
  let age = today.getUTCFullYear() - year;
  const currentMonth = today.getUTCMonth() + 1;
  const currentDay = today.getUTCDate();

  if (currentMonth < month || (currentMonth === month && currentDay < day)) {
    age -= 1;
  }

  return {
    age,
    birthday,
    isRealDate:
      birthday.getUTCFullYear() === year &&
      birthday.getUTCMonth() === month - 1 &&
      birthday.getUTCDate() === day,
  };
}

function isStringOrStringArray(value) {
  return typeof value === "string" || Array.isArray(value);
}

function normalizeStringList(value) {
  if (value === undefined) {
    return undefined;
  }

  const values = Array.isArray(value) ? value : String(value).split(",");

  return [...new Set(
    values
      .map((item) => String(item).trim())
      .filter(Boolean),
  )];
}

function normalizeInterests(interests) {
  return normalizeStringList(interests);
}

function getPlainObject(value) {
  return value?.toObject?.() || value || {};
}

function normalizeProfileDetails(profileDetails) {
  if (profileDetails === undefined) {
    return undefined;
  }

  const normalized = {};

  PROFILE_DETAIL_STRING_FIELDS.forEach((field) => {
    if (profileDetails[field] !== undefined) {
      normalized[field] = String(profileDetails[field]).trim();
    }
  });

  PROFILE_DETAIL_ARRAY_FIELDS.forEach((field) => {
    if (profileDetails[field] !== undefined) {
      normalized[field] = normalizeStringList(profileDetails[field]);
    }
  });

  return normalized;
}

function normalizeAdvancedFilters(advancedFilters) {
  if (advancedFilters === undefined) {
    return undefined;
  }

  const normalized = {};

  ADVANCED_FILTER_STRING_FIELDS.forEach((field) => {
    if (advancedFilters[field] !== undefined) {
      normalized[field] = String(advancedFilters[field]).trim();
    }
  });

  ADVANCED_FILTER_ARRAY_FIELDS.forEach((field) => {
    if (advancedFilters[field] !== undefined) {
      normalized[field] = normalizeStringList(advancedFilters[field]);
    }
  });

  return normalized;
}

function getRequestedAgeRange(payload, user) {
  const requestedMinAge = payload.minAge ?? payload.preferences?.ageRange?.min;
  const requestedMaxAge = payload.maxAge ?? payload.preferences?.ageRange?.max;

  return {
    requestedMinAge,
    requestedMaxAge,
    effectiveMinAge: requestedMinAge !== undefined
      ? Number(requestedMinAge)
      : user.preferences?.ageRange?.min,
    effectiveMaxAge: requestedMaxAge !== undefined
      ? Number(requestedMaxAge)
      : user.preferences?.ageRange?.max,
  };
}

function validateAgeNumber(value, fieldName, errors) {
  if (value === undefined) {
    return;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    errors[fieldName] = `${fieldName} must be an integer.`;
  } else if (parsed < MIN_ALLOWED_AGE || parsed > MAX_ALLOWED_AGE) {
    errors[fieldName] = `${fieldName} must be between ${MIN_ALLOWED_AGE} and ${MAX_ALLOWED_AGE}.`;
  }
}

function validateGender(value, errors) {
  if (value === undefined) {
    return;
  }

  errors.gender = "Gender can only be set during registration.";
}

function validateLocation(value, errors) {
  if (value === undefined) {
    return;
  }

  const coordinates = value?.coordinates;
  const [lng, lat] = Array.isArray(coordinates) ? coordinates.map(Number) : [];

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value.type !== "Point" ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    lng < -180 ||
    lng > 180 ||
    lat < -90 ||
    lat > 90
  ) {
    errors.location = "Location must be a GeoJSON Point with [lng, lat] coordinates.";
  }
}

function validateAdvancedFiltersPayload(advancedFilters, errors) {
  if (advancedFilters === undefined) {
    return;
  }

  if (!advancedFilters || typeof advancedFilters !== "object" || Array.isArray(advancedFilters)) {
    errors.advancedFilters = "Advanced filters must be an object.";
    return;
  }

  ADVANCED_FILTER_STRING_FIELDS.forEach((field) => {
    if (advancedFilters[field] !== undefined && typeof advancedFilters[field] !== "string") {
      errors[`advancedFilters.${field}`] = `${field} must be text.`;
      return;
    }

    const value = String(advancedFilters[field] || "").trim();
    if (value.length > 80) {
      errors[`advancedFilters.${field}`] = `${field} must be 80 characters or less.`;
    }
  });

  ADVANCED_FILTER_ARRAY_FIELDS.forEach((field) => {
    if (advancedFilters[field] !== undefined && !isStringOrStringArray(advancedFilters[field])) {
      errors[`advancedFilters.${field}`] = `${field} must be an array or comma-separated text.`;
      return;
    }

    const normalizedValues = normalizeStringList(advancedFilters[field]);
    if (normalizedValues === undefined) {
      return;
    }

    const tooLongValue = normalizedValues.find((value) => value.length > 40);

    if (normalizedValues.length > 20) {
      errors[`advancedFilters.${field}`] = `${field} can contain at most 20 items.`;
    } else if (tooLongValue) {
      errors[`advancedFilters.${field}`] = `Each ${field} item must be 40 characters or less.`;
    }
  });
}

function getRequestedMaxDistance(payload, user) {
  const requestedMaxDistanceKm = payload.maxDistanceKm ?? payload.preferences?.maxDistanceKm;

  return {
    requestedMaxDistanceKm,
    effectiveMaxDistanceKm: requestedMaxDistanceKm !== undefined
      ? Number(requestedMaxDistanceKm)
      : user.preferences?.maxDistanceKm,
  };
}

function getRequestedSearchPreferenceBoolean(payload, fieldName) {
  return payload[fieldName] ?? payload.preferences?.[fieldName];
}

function normalizePhotos(photos) {
  if (photos === undefined) {
    return undefined;
  }

  return photos.map((photo, index) => ({
    url: String(photo.url).trim(),
    publicId: photo.publicId ? String(photo.publicId).trim() : undefined,
    isPrimary: index === 0,
  }));
}

function validateProfilePayload(payload, user) {
  const errors = {};

  if (payload.name !== undefined) {
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (typeof payload.name !== "string") {
      errors.name = "Name must be text.";
    } else if (!name) {
      errors.name = "Name is required.";
    } else if (name.length < 2) {
      errors.name = "Name must be at least 2 characters.";
    } else if (name.length > 80) {
      errors.name = "Name must be 80 characters or less.";
    }
  }

  if (payload.bio !== undefined) {
    const bio = typeof payload.bio === "string" ? payload.bio.trim() : "";
    if (typeof payload.bio !== "string") {
      errors.bio = "Bio must be text.";
    } else if (bio.length > 500) {
      errors.bio = "Bio must be 500 characters or less.";
    }
  }

  if (payload.jobTitle !== undefined) {
    const jobTitle = typeof payload.jobTitle === "string" ? payload.jobTitle.trim() : "";
    if (typeof payload.jobTitle !== "string") {
      errors.jobTitle = "Job title must be text.";
    } else if (jobTitle.length > 80) {
      errors.jobTitle = "Job title must be 80 characters or less.";
    }
  }

  if (payload.school !== undefined) {
    const school = typeof payload.school === "string" ? payload.school.trim() : "";
    if (typeof payload.school !== "string") {
      errors.school = "School must be text.";
    } else if (school.length > 120) {
      errors.school = "School must be 120 characters or less.";
    }
  }

  if (payload.birthDate !== undefined) {
    if (typeof payload.birthDate !== "string") {
      errors.birthDate = "Use YYYY-MM-DD format.";
    } else if (!BIRTHDAY_PATTERN.test(payload.birthDate)) {
      errors.birthDate = "Use YYYY-MM-DD format.";
    } else {
      const { age, birthday, isRealDate } = getAgeFromBirthDateString(payload.birthDate);

      if (!isRealDate) {
        errors.birthDate = "Enter a real birthday.";
      } else if (birthday > new Date()) {
        errors.birthDate = "Birthday cannot be in the future.";
      } else if (age < MIN_ALLOWED_AGE) {
        errors.birthDate = "You must be at least 18 years old.";
      } else if (age > MAX_ALLOWED_AGE) {
        errors.birthDate = "Enter a realistic birthday.";
      }
    }
  }

  if (payload.age !== undefined) {
    validateAgeNumber(payload.age, "age", errors);
  }

  validateGender(payload.gender, errors);
  validateLocation(payload.location, errors);

  if (payload.interests !== undefined) {
    if (!isStringOrStringArray(payload.interests)) {
      errors.interests = "Interests must be an array or comma-separated text.";
    } else {
      const normalizedInterests = normalizeInterests(payload.interests);
      const tooLongInterest = normalizedInterests.find((interest) => interest.length > 40);

      if (normalizedInterests.length > 20) {
        errors.interests = "Interests can contain at most 20 items.";
      } else if (tooLongInterest) {
        errors.interests = "Each interest must be 40 characters or less.";
      }
    }
  }

  if (payload.profileDetails !== undefined) {
    if (
      !payload.profileDetails ||
      typeof payload.profileDetails !== "object" ||
      Array.isArray(payload.profileDetails)
    ) {
      errors.profileDetails = "Profile details must be an object.";
    } else {
      PROFILE_DETAIL_STRING_FIELDS.forEach((field) => {
        if (
          payload.profileDetails[field] !== undefined &&
          typeof payload.profileDetails[field] !== "string"
        ) {
          errors[`profileDetails.${field}`] = `${field} must be text.`;
          return;
        }

        const value = String(payload.profileDetails[field] || "").trim();
        if (value.length > 80) {
          errors[`profileDetails.${field}`] = `${field} must be 80 characters or less.`;
        }
      });

      PROFILE_DETAIL_ARRAY_FIELDS.forEach((field) => {
        if (
          payload.profileDetails[field] !== undefined &&
          !isStringOrStringArray(payload.profileDetails[field])
        ) {
          errors[`profileDetails.${field}`] = `${field} must be an array or comma-separated text.`;
          return;
        }

        const normalizedValues = normalizeStringList(payload.profileDetails[field]);
        if (normalizedValues === undefined) {
          return;
        }

        const tooLongValue = normalizedValues.find((value) => value.length > 40);

        if (normalizedValues.length > 10) {
          errors[`profileDetails.${field}`] = `${field} can contain at most 10 items.`;
        } else if (tooLongValue) {
          errors[`profileDetails.${field}`] = `Each ${field} item must be 40 characters or less.`;
        }
      });
    }
  }

  const { requestedMaxDistanceKm } = getRequestedMaxDistance(payload, user);

  if (requestedMaxDistanceKm !== undefined) {
    const parsedDistance = Number(requestedMaxDistanceKm);

    if (!Number.isInteger(parsedDistance)) {
      errors.maxDistanceKm = "maxDistanceKm must be an integer.";
    } else if (parsedDistance < MIN_DISTANCE_KM || parsedDistance > MAX_DISTANCE_KM) {
      errors.maxDistanceKm = `maxDistanceKm must be between ${MIN_DISTANCE_KM} and ${MAX_DISTANCE_KM}.`;
    }
  }

  ["expandDistance", "expandAge"].forEach((fieldName) => {
    const value = getRequestedSearchPreferenceBoolean(payload, fieldName);

    if (value !== undefined && typeof value !== "boolean") {
      errors[fieldName] = `${fieldName} must be a boolean.`;
    }
  });
  validateAdvancedFiltersPayload(
    payload.advancedFilters ?? payload.preferences?.advancedFilters,
    errors,
  );

  if (payload.photos !== undefined) {
    if (!Array.isArray(payload.photos)) {
      errors.photos = "Photos must be an array.";
    } else if (payload.photos.length > MAX_PROFILE_PHOTOS) {
      errors.photos = `Profile can contain at most ${MAX_PROFILE_PHOTOS} photos.`;
    } else {
      const invalidPhoto = payload.photos.find((photo) => {
        const url = typeof photo?.url === "string" ? photo.url.trim() : "";
        return !url;
      });

      if (invalidPhoto) {
        errors.photos = "Each photo must include a valid url.";
      }
    }
  }

  const genderPreference = payload.genderPreference ?? payload.interestedIn;
  if (genderPreference !== undefined) {
    if (!isStringOrStringArray(genderPreference)) {
      errors.genderPreference = "genderPreference must be an array or comma-separated text.";
    } else {
      const normalizedGenderPreference = normalizeStringList(genderPreference);
      const invalidGender = normalizedGenderPreference.find(
        (gender) => !ALLOWED_GENDERS.includes(gender),
      );

      if (!normalizedGenderPreference.length) {
        errors.genderPreference = "Select at least one gender preference.";
      } else if (invalidGender) {
        errors.genderPreference = "Select a valid gender preference.";
      }
    }
  }

  const {
    requestedMinAge,
    requestedMaxAge,
    effectiveMinAge,
    effectiveMaxAge,
  } = getRequestedAgeRange(payload, user);

  validateAgeNumber(requestedMinAge, "minAge", errors);
  validateAgeNumber(requestedMaxAge, "maxAge", errors);

  if (
    !errors.minAge &&
    !errors.maxAge &&
    Number.isFinite(effectiveMinAge) &&
    Number.isFinite(effectiveMaxAge) &&
    effectiveMinAge > effectiveMaxAge
  ) {
    errors.ageRange = "minAge must be less than or equal to maxAge.";
  }

  return errors;
}

function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0;
}

function birthDateFromAge(age) {
  if (age === undefined) {
    return undefined;
  }

  const parsedAge = Number(age);
  if (!Number.isFinite(parsedAge)) {
    return undefined;
  }

  const birthDate = new Date();
  birthDate.setFullYear(birthDate.getFullYear() - parsedAge);
  birthDate.setHours(0, 0, 0, 0);
  return birthDate;
}

function mapProfilePayloadToUser(user, payload) {
  if (payload.name !== undefined) {
    user.name = String(payload.name).trim();
  }

  if (payload.bio !== undefined) {
    user.bio = String(payload.bio).trim();
  }

  if (payload.jobTitle !== undefined) {
    user.jobTitle = String(payload.jobTitle).trim();
  }

  if (payload.school !== undefined) {
    user.school = String(payload.school).trim();
  }

  if (payload.birthDate !== undefined) {
    user.birthDate = new Date(`${payload.birthDate}T00:00:00.000Z`);
  } else {
    const mappedBirthDate = birthDateFromAge(payload.age);
    if (mappedBirthDate) {
      user.birthDate = mappedBirthDate;
    }
  }

  if (payload.location !== undefined) {
    user.location = {
      type: "Point",
      coordinates: payload.location.coordinates.map(Number),
    };
  }

  const normalizedInterests = normalizeInterests(payload.interests);
  if (normalizedInterests !== undefined) {
    user.interests = normalizedInterests;
  }

  const normalizedProfileDetails = normalizeProfileDetails(payload.profileDetails);
  if (normalizedProfileDetails !== undefined) {
    user.profileDetails = {
      ...getPlainObject(user.profileDetails),
      ...normalizedProfileDetails,
    };
  }

  const normalizedPhotos = normalizePhotos(payload.photos);
  if (normalizedPhotos !== undefined) {
    user.photos = normalizedPhotos;
  }
}

function mapSearchFilterPayloadToUser(user, payload) {
  const genderPreference = payload.genderPreference ?? payload.interestedIn;
  const normalizedGenderPreference = normalizeStringList(genderPreference);

  if (normalizedGenderPreference !== undefined) {
    user.interestedIn = normalizedGenderPreference;
  }

  const { requestedMinAge, requestedMaxAge } = getRequestedAgeRange(payload, user);

  if (requestedMinAge !== undefined || requestedMaxAge !== undefined) {
    const currentPreferences = getPlainObject(user.preferences);
    user.preferences = {
      ...currentPreferences,
      ageRange: {
        min: requestedMinAge !== undefined
          ? Number(requestedMinAge)
          : user.preferences?.ageRange?.min,
        max: requestedMaxAge !== undefined
          ? Number(requestedMaxAge)
          : user.preferences?.ageRange?.max,
      },
    };
  }

  const { requestedMaxDistanceKm } = getRequestedMaxDistance(payload, user);
  const requestedExpandDistance = getRequestedSearchPreferenceBoolean(payload, "expandDistance");
  const requestedExpandAge = getRequestedSearchPreferenceBoolean(payload, "expandAge");
  const requestedAdvancedFilters = normalizeAdvancedFilters(
    payload.advancedFilters ?? payload.preferences?.advancedFilters,
  );

  if (
    requestedMaxDistanceKm !== undefined ||
    requestedExpandDistance !== undefined ||
    requestedExpandAge !== undefined ||
    requestedAdvancedFilters !== undefined
  ) {
    const currentPreferences = getPlainObject(user.preferences);
    user.preferences = {
      ...currentPreferences,
      maxDistanceKm: requestedMaxDistanceKm !== undefined
        ? Number(requestedMaxDistanceKm)
        : user.preferences?.maxDistanceKm,
      expandDistance: requestedExpandDistance !== undefined
        ? requestedExpandDistance
        : user.preferences?.expandDistance ?? true,
      expandAge: requestedExpandAge !== undefined
        ? requestedExpandAge
        : user.preferences?.expandAge ?? true,
      advancedFilters: requestedAdvancedFilters !== undefined
        ? {
          ...getPlainObject(user.preferences?.advancedFilters),
          ...requestedAdvancedFilters,
        }
        : user.preferences?.advancedFilters,
      ageRange: currentPreferences.ageRange || user.preferences?.ageRange,
    };
  }
}

function buildUserProfileResponse(user) {
  const profile = user.toProfileJSON();
  const ageRange = profile.preferences?.ageRange || {};
  const expandDistance = profile.preferences?.expandDistance ?? true;
  const expandAge = profile.preferences?.expandAge ?? true;
  const advancedFilters = profile.preferences?.advancedFilters || {};

  return {
    ...profile,
    genderPreference: profile.interestedIn,
    minAge: ageRange.min,
    maxAge: ageRange.max,
    maxDistanceKm: profile.preferences?.maxDistanceKm,
    expandDistance,
    expandAge,
    advancedFilters,
    searchFilters: {
      genderPreference: profile.interestedIn,
      minAge: ageRange.min,
      maxAge: ageRange.max,
      maxDistanceKm: profile.preferences?.maxDistanceKm,
      expandDistance,
      expandAge,
      advancedFilters,
    },
  };
}

const updateProfile = asyncHandler(async (req, res) => {
  const validationErrors = validateProfilePayload(req.body, req.user);

  if (hasValidationErrors(validationErrors)) {
    throw httpError(400, "Please fix the highlighted fields.", validationErrors);
  }

  mapProfilePayloadToUser(req.user, req.body);
  mapSearchFilterPayloadToUser(req.user, req.body);

  await req.user.save();
  res.json({
    message: "Profile updated successfully",
    user: buildUserProfileResponse(req.user),
  });
});

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
          ...buildDiscoveryMatchStage(req.user, [req.user._id, ...excludedObjectIds]),
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          birthDate: 1,
          gender: 1,
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

    const mappedUsers = users.map(formatDiscoveryCandidate).map((user) => ({
      _id: user._id,
      id: user.id,
      name: user.name,
      gender: user.gender,
      age: user.age,
      bio: user.bio,
      photos: user.photos,
      location: user.location,
      distanceMeters: user.distanceMeters,
      distanceKm: user.distanceKm,
    }));

    return res.json({ users: mappedUsers });
  } catch (error) {
    console.error("Explore error:", error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = {
  explore,
  updateProfile,
};
