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

module.exports = { User, RefreshToken };

