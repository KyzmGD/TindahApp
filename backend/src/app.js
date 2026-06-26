const express = require("express");
const cors = require("cors"); // 🌟 1. Thêm thư viện cors chính thức ở đây
const routes = require("./routes");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();

// 🌟 2. THAY THẾ CẤU HÌNH CORS THỦ CÔNG BẰNG THƯ VIỆN CORS CHUẨN
const allowedOrigins = [
  "http://localhost:8081", // Cổng của Expo Web
  "http://localhost:19000",
  "http://127.0.0.1:8081",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Cho phép gọi không cần origin (như Mobile App, Postman) hoặc nằm trong danh sách, hoặc đang ở môi trường Dev
      if (
        !origin ||
        allowedOrigins.indexOf(origin) !== -1 ||
        process.env.NODE_ENV !== "production"
      ) {
        callback(null, true);
      } else {
        callback(new Error("Bị chặn bởi cơ chế bảo mật CORS của Server!"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  }),
);

app.use(express.json({ limit: "2mb" }));

// --- CẤU HÌNH SWAGGER VÀO ĐÂY ---
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
  // 🌟 Đã sửa lại đường dẫn động để quét chính xác thư mục routes dù chạy từ bất kỳ đâu
  apis: ["src/routes/*.js", "src/routes/**/*.js", "src/app.js", "./src/app.js"],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// ------------------------------------------------

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Kiểm tra trạng thái hệ thống
 *     description: Trả về trạng thái hoạt động hiện tại của API server.
 *     responses:
 *       200:
 *         description: Server hoạt động bình thường.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
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
  let status = error.statusCode || 500;
  const payload = {
    message: error.message || "Internal server error",
  };

  if (error.name === "CastError") {
    status = 400;
    payload.message = `Invalid ${error.path}`;
  }

  if (error.name === "ValidationError") {
    status = 400;
    payload.message =
      Object.values(error.errors)[0]?.message || "Validation failed";
  }

  if (error.code === 11000) {
    status = 409;
    payload.message = "Duplicate resource";
  }

  if (process.env.NODE_ENV !== "production" && error.details) {
    payload.details = error.details;
  }

  res.status(status).json(payload);
});

module.exports = app;
