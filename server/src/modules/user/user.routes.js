const express = require("express");
const router = express.Router();
const userController = require("./user.controller");
const upload = require("../../shared/middleware/upload");
const { requireRole } = require("../../shared/middleware/authMiddleware");
const { ROLES } = require("../../shared/constants");

// Tất cả routes đều cần đăng nhập (protect được gắn ở routes.js)
router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);
router.put("/avatar", upload.single("avatar"), userController.updateAvatar);
router.put("/change-password", userController.changePassword);

// Admin: phân quyền + quản lý người dùng
router.get("/", requireRole(ROLES.ADMIN), userController.listUsers);
router.patch(
  "/:id/role",
  requireRole(ROLES.ADMIN),
  userController.updateUserRole,
);
router.patch(
  "/:id/active-status",
  requireRole(ROLES.ADMIN),
  userController.updateUserActiveStatus,
);

module.exports = router;
