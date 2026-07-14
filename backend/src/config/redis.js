const { createClient } = require("redis");

let client;

async function connectRedis() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  client = createClient({
    url: process.env.REDIS_URL,
    socket: { reconnectStrategy: false },
  });
  client.on("error", (error) => {
    console.warn("Redis error:", error.message);
  });

  try {
    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis connection timeout")), 3000),
      ),
    ]);
    console.log("Redis connected");
    return client;
  } catch (error) {
    console.warn("Redis unavailable, continuing without cache:", error.message);
    try {
      await client.disconnect();
    } catch (disconnectError) {
      // ignore disconnect cleanup errors
    }
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
