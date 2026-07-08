const allowedGenders = ["woman", "man", "nonbinary", "other"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthdayPattern = /^\d{4}-\d{2}-\d{2}$/;

function getAgeFromBirthday(birthDate) {
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

function validateLoginPayload(payload) {
  const errors = {};
  const email = typeof payload.email === "string" ? payload.email.trim() : "";

  if (!email) {
    errors.email = "Email is required.";
  } else if (!emailPattern.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (typeof payload.password !== "string" || !payload.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

function validateRegisterPayload(payload) {
  const errors = validateLoginPayload(payload);
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const birthDate = typeof payload.birthDate === "string" ? payload.birthDate : "";

  if (!name) {
    errors.name = "Name is required.";
  } else if (name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (name.length > 80) {
    errors.name = "Name must be 80 characters or less.";
  }

  if (password && password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (password && !/[A-Za-z]/.test(password)) {
    errors.password = "Password needs at least one letter.";
  } else if (password && !/\d/.test(password)) {
    errors.password = "Password needs at least one number.";
  }

  if (!birthDate) {
    errors.birthDate = "Birthday is required.";
  } else if (!birthdayPattern.test(birthDate)) {
    errors.birthDate = "Use YYYY-MM-DD format.";
  } else {
    const { age, birthday, isRealDate } = getAgeFromBirthday(birthDate);

    if (!isRealDate) {
      errors.birthDate = "Enter a real birthday.";
    } else if (birthday > new Date()) {
      errors.birthDate = "Birthday cannot be in the future.";
    } else if (age < 18) {
      errors.birthDate = "You must be at least 18 years old.";
    } else if (age > 100) {
      errors.birthDate = "Enter a realistic birthday.";
    }
  }

  if (payload.gender && !allowedGenders.includes(payload.gender)) {
    errors.gender = "Select a valid gender.";
  }

  return errors;
}

function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0;
}

module.exports = {
  validateLoginPayload,
  validateRegisterPayload,
  hasValidationErrors,
};
