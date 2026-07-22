require("dotenv").config({
  path: "./.env",
});

const http = require("http");
const app = require("./app");
const connectDatabase = require("./config/database");
const { connectRedis } = require("./config/redis");
const registerChatSocket = require("./sockets/chat.socket");

const port = process.env.PORT || 5000;
const server = http.createServer(app);

async function bootstrap() {
  try {
    await connectDatabase();
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }

  try {
    await connectRedis();
  } catch (error) {
    console.warn("Redis startup warning:", error.message);
  }

  try {
    registerChatSocket(server, app);
  } catch (error) {
    console.warn("Socket startup warning:", error.message);
  }

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${port} is already in use. Please stop the other process and try again.`,
      );
      process.exit(1);
    }

    console.error("Server error:", error);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

module.exports = server;
