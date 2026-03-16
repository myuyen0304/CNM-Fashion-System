const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: String,
  imageUrl: String,
  unitPrice: Number,
  size: {
    type: String,
    default: "",
    trim: true,
  },
  quantity: {
    type: Number,
    min: 1,
    required: true,
  },
});

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  { timestamps: true },
);

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
