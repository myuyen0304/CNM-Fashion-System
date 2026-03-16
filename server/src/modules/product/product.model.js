const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên sản phẩm là bắt buộc"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Giá là bắt buộc"],
      min: [0, "Giá không được âm"],
    },
    stock: {
      type: Number,
      required: true,
      min: [0, "Số lượng tồn kho không được âm"],
      default: 0,
    },
    category: {
      type: String,
      required: [true, "Danh mục là bắt buộc"],
      trim: true,
    },
    sizes: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    imageVector: {
      type: [Number],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    soldCount: {
      type: Number,
      default: 0,
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  { timestamps: true },
);

// Text index cho full-text search
productSchema.index({ name: "text", description: "text", category: "text" });

// Index cho lọc nhanh
productSchema.index({ category: 1, price: 1 });
productSchema.index({ status: 1 });
productSchema.index({ soldCount: -1 });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
