const express = require("express");
const router = express.Router();
const paymentController = require("./payment.controller");

// Public routes (VNPay callback không cần auth)
router.get("/vnpay/callback", paymentController.vnpayCallback);

// Protected routes
router.post("/initiate", paymentController.initiatePayment);

module.exports = router;
