/**
 * Custom error class với status code.
 * Dùng: throw new ApiError(400, 'Thiếu thông tin')
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // phân biệt lỗi nghiệp vụ vs lỗi hệ thống
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
