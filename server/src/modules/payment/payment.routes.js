const express = require("express");
const router = express.Router();
const paymentController = require("./payment.controller");
const { protect } = require("../../shared/middleware/authMiddleware");

// Public routes (VNPay callback không cần auth)
router.get("/vnpay/callback", paymentController.vnpayCallback);

// Protected routes
router.post("/initiate", protect, paymentController.initiatePayment);

module.exports = router;
