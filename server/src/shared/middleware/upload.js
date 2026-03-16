const multer = require("multer");
const ApiError = require("../utils/ApiError");

// Lưu file vào memory (buffer) để upload lên Cloudinary
const storage = multer.memoryStorage();

// Kiểm tra file type
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Chỉ chấp nhận file ảnh (JPEG, PNG, WebP)."), false);
  }
};

// Upload 1 ảnh, max 5MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
