const ApiError = require("../utils/ApiError");

/**
 * Global error handler middleware.
 * Phải đặt sau tất cả routes trong app.js
 */
const errorHandler = (err, req, res, next) => {
  // Log lỗi cho dev debug
  if (process.env.NODE_ENV === "development") {
    if (err instanceof ApiError && err.statusCode < 500) {
      console.warn(
        `API ${err.statusCode} ${req.method} ${req.originalUrl}: ${err.message}`,
      );
    } else {
      console.error("ERROR:", err);
    }
  }

  // Lỗi nghiệp vụ (do mình throw)
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(", "),
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} đã tồn tại.`,
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "ID không hợp lệ.",
    });
  }

  // Lỗi không xác định
  return res.status(500).json({
    success: false,
    message: "Lỗi hệ thống. Vui lòng thử lại sau.",
  });
};

module.exports = { errorHandler };
