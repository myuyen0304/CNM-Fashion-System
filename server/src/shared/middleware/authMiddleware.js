const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../constants");
const User = require("../../modules/auth/auth.model").User;

/**
 * Middleware xác thực JWT.
 * Lấy token từ header Authorization: Bearer <token>
 * Gắn user vào req.user
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(
        401,
        "Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.",
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      throw new ApiError(401, "Tài khoản không tồn tại.");
    }

    if (user.isActive === false) {
      throw new ApiError(403, "Tài khoản đã bị khóa.");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new ApiError(401, "Token không hợp lệ."));
    }
    if (error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Token đã hết hạn."));
    }
    next(error);
  }
};

/**
 * Middleware kiểm tra role.
 * Dùng: router.get('/admin', protect, requireRole('admin'), controller)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Chưa đăng nhập."));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, "Bạn không có quyền thực hiện thao tác này."),
      );
    }
    next();
  };
};

const requireAnyStaffRole = requireRole(
  ROLES.ADMIN,
  ROLES.SUPERVISOR,
  ROLES.EMPLOYEE,
);

module.exports = { protect, requireRole, requireAnyStaffRole };
