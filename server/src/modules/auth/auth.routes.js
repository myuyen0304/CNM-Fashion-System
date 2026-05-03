const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  otpLimiter,
} = require("../../shared/middleware/rateLimiter");

router.post("/register", registerLimiter, authController.register);
router.post("/verify-registration-otp", otpLimiter, authController.verifyRegistrationOtp);
router.post("/resend-registration-otp", otpLimiter, authController.resendRegistrationOtp);
router.get("/verify-email/:token", authController.verifyEmail);
router.post("/login", loginLimiter, authController.login);
router.post("/forgot-password", forgotPasswordLimiter, authController.forgotPassword);
router.post("/reset-password", otpLimiter, authController.resetPassword);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

module.exports = router;
