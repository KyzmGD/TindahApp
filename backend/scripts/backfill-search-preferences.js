require("dotenv").config({
  path: "./.env",
});

const mongoose = require("mongoose");
const connectDatabase = require("../src/config/database");
const User = require("../src/models/User");

async function backfillSearchPreferences() {
  await connectDatabase();

  await User.init();

  const result = await User.updateMany(
    {
      $or: [
        { "preferences.expandDistance": { $exists: false } },
        { "preferences.expandAge": { $exists: false } },
      ],
    },
    {
      $set: {
        "preferences.expandDistance": true,
        "preferences.expandAge": true,
      },
    },
  );

  console.log(
    `Search preference backfill complete. Matched: ${result.matchedCount}, modified: ${result.modifiedCount}.`,
  );
}

backfillSearchPreferences()
  .catch((error) => {
    console.error("Search preference backfill failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
