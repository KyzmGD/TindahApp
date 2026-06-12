const { createClient } = require("redis");

let client;

async function connectRedis() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  client = createClient({ url: process.env.REDIS_URL });
  client.on("error", (error) => {
    console.warn("Redis error:", error.message);
  });

  try {
    await client.connect();
    console.log("Redis connected");
    return client;
  } catch (error) {
    console.warn("Redis unavailable, continuing without cache:", error.message);
    client = null;
    return null;
  }
}

function getRedisClient() {
  return client;
}

module.exports = {
  connectRedis,
  getRedisClient,
};
