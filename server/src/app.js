const express = require("express");
const cors = require("cors");
const path = require("path");
const { errorHandler } = require("./shared/middleware/errorHandler");
const setupRoutes = require("./routes");

const app = express();

// --- Middleware ---
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (temp, trước khi dùng Cloudinary)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// --- Routes ---
setupRoutes(app);

// --- Health check ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Error handler (phải ở cuối) ---
app.use(errorHandler);

module.exports = app;
