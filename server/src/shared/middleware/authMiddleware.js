const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../constants");
const User = require("../../modules/auth/auth.model").User;

/**
 * Middleware xác th?c JWT.
 * L?y token t? header Authorization: Bearer <token>
 * G?n user vào req.user
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(
        401,
        "Chua dang nh?p. Vui lòng dang nh?p d? ti?p t?c.",
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      throw new ApiError(401, "Tài kho?n không t?n t?i.");
    }

    if (user.isActive === false) {
      throw new ApiError(403, "Tài kho?n dã b? khóa.");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new ApiError(401, "Token không h?p l?."));
    }
    if (error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Token dã h?t h?n."));
    }
    next(error);
  }
};

/**
 * Middleware ki?m tra role.
 * Dùng: router.get('/admin', protect, requireRole('admin'), controller)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Chua dang nh?p."));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, "B?n không có quy?n th?c hi?n thao tác này."),
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

