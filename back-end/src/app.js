const express = require("express");
const routes = require("./routes");

const app = express();

app.use((req, res, next) => {
  const allowedOrigin = process.env.CLIENT_ORIGIN || "*";
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json({ limit: "2mb" }));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "tinder-clone-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const payload = {
    message: error.message || "Internal server error",
  };

  if (process.env.NODE_ENV !== "production" && error.details) {
    payload.details = error.details;
  }

  res.status(status).json(payload);
});

module.exports = app;
