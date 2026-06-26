require("dotenv").config();

const http = require("http");
const app = require("./app");
const connectDatabase = require("./config/database");
const { connectRedis } = require("./config/redis");
const registerChatSocket = require("./sockets/chat.socket");

const port = process.env.PORT || 5000;
const server = http.createServer(app);

async function bootstrap() {
  await connectDatabase();
  await connectRedis();
  registerChatSocket(server, app);

  server.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

module.exports = server;
