const express = require("express");
const routes = require("./routes");
const swaggerUi = require("swagger-ui-express"); // 🌟 1. Thêm dòng này
const swaggerJsdoc = require("swagger-jsdoc"); // 🌟 2. Thêm dòng này

const app = express();

app.use((req, res, next) => {
  const allowedOrigin = process.env.CLIENT_ORIGIN || "*";
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json({ limit: "2mb" }));

// --- 🌟 3. THÊM ĐOẠN CẤU HÌNH SWAGGER VÀO ĐÂY ---
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Tinder App API",
      version: "1.0.0",
      description: "Backend API for a Tinder-style dating app clone.",
    },
    servers: [
      {
        url: "http://localhost:5000",
      },
    ],
  },
  // Đường dẫn quét comment để tạo docs, quét toàn bộ file trong thư mục routes và file app.js
  apis: ["./src/routes/*.js", "./src/routes/**/*.js", "./src/app.js"],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
// Đăng ký route chính thức cho Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// ------------------------------------------------

/**
 * @swagger
 * /health:
 *   get:
 *      summary: Kiểm tra trạng thái hệ thống
 *      description: Trả về trạng thái hoạt động hiện tại của API server.
 *      responses:
 *         200:
 *           description: Server hoạt động bình thường.
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     example: ok
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "tinder-clone-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", routes);

// Middleware xử lý 404 (BẮT BUỘC ĐỂ DƯỚI SWAGGER VÀ CÁC ROUTE KHÁC)
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
