const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Unique constraint: 1 customer chỉ review 1 lần cho 1 sản phẩm qua 1 đơn hàng
reviewSchema.index(
  { customerId: 1, productId: 1, orderId: 1 },
  { unique: true },
);
reviewSchema.index({ productId: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
