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

  const normalizedInterests = normalizeInterests(payload.interests);
  if (normalizedInterests !== undefined) {
    user.interests = normalizedInterests;
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
    const currentPreferences = user.preferences?.toObject?.() || user.preferences || {};
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
}

function buildUserProfileResponse(user) {
  const profile = user.toProfileJSON();
  const ageRange = profile.preferences?.ageRange || {};

  return {
    ...profile,
    genderPreference: profile.interestedIn,
    minAge: ageRange.min,
    maxAge: ageRange.max,
    searchFilters: {
      genderPreference: profile.interestedIn,
      minAge: ageRange.min,
      maxAge: ageRange.max,
      maxDistanceKm: profile.preferences?.maxDistanceKm,
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
