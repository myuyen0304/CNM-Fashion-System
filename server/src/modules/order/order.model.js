const mongoose = require("mongoose");
const {
  ORDER_STATUS,
  TRANSACTION_STATUS,
  PAYMENT_METHODS,
} = require("../../shared/constants");

const orderItemSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: String,
  imageUrl: String,
  unitPrice: Number,
  quantity: {
    type: Number,
    min: 1,
    required: true,
  },
});

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  method: {
    type: String,
    enum: Object.values(PAYMENT_METHODS),
  },
  status: {
    type: String,
    enum: Object.values(TRANSACTION_STATUS),
  },
  reason: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingAddress: {
      type: String,
      required: true,
    },
    shippingPhone: {
      type: String,
      required: true,
    },
    shippingMethod: {
      type: String,
      enum: ["standard", "express"],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: true,
    },
    items: [orderItemSchema],
    transaction: transactionSchema,
  },
  { timestamps: true },
);

// Index cho tìm kiếm nhanh
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
