const mongoose = require("mongoose");
const { ROLES } = require("../../shared/constants");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ========================
// USER
// ========================
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên là b?t bu?c"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email là b?t bu?c"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, "Email không dúng d?nh d?ng"],
    },
    password: {
      type: String,
      required: [true, "M?t kh?u là b?t bu?c"],
      minlength: 8,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

// ========================
// REFRESH TOKEN
// ========================
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ userId: 1 });

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

// ========================
// OTP TOKEN
// ========================
const otpTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, "Email không dúng d?nh d?ng"],
    },
    purpose: {
      type: String,
      enum: ["register_verification", "password_reset"],
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

otpTokenSchema.index({ email: 1, purpose: 1 }, { unique: true });
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpToken = mongoose.model("OtpToken", otpTokenSchema);

module.exports = { User, RefreshToken, OtpToken };
