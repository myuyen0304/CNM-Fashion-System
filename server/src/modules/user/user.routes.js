const express = require("express");
const router = express.Router();
const userController = require("./user.controller");
const upload = require("../../shared/middleware/upload");

// Tất cả routes đều cần đăng nhập (protect được gắn ở routes.js)
router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);
router.put("/avatar", upload.single("avatar"), userController.updateAvatar);
router.put("/change-password", userController.changePassword);

module.exports = router;
