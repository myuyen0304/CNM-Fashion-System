const Review = require("./review.model");
const mongoose = require("mongoose");

const createReview = async (reviewData) => {
  const review = new Review(reviewData);
  return review.save();
};

const findReviewById = async (id) => {
  return Review.findById(id);
};

const findByProduct = async (productId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    Review.find({ productId })
      .populate("customerId", "name avatarUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({ productId }),
  ]);
  return { reviews, total, page, totalPages: Math.ceil(total / limit) };
};

const findByCustomerAndProduct = async (customerId, productId, orderId) => {
  return Review.findOne({ customerId, productId, orderId });
};

const findByCustomerAndOrder = async (customerId, orderId) => {
  return Review.find({ customerId, orderId })
    .populate("productId", "name images")
    .sort({ createdAt: -1 });
};

const calculateAvgRating = async (productId) => {
  const normalizedProductId =
    typeof productId === "string" && mongoose.Types.ObjectId.isValid(productId)
      ? new mongoose.Types.ObjectId(productId)
      : productId;

  const result = await Review.aggregate([
    { $match: { productId: normalizedProductId } },
    {
      $group: {
        _id: "$productId",
        totalStars: { $sum: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (result.length === 0) {
    return { avgRating: 0, count: 0, totalStars: 0 };
  }

  const { totalStars, count } = result[0];
  return {
    totalStars,
    count,
    avgRating: count > 0 ? totalStars / count : 0,
  };
};

module.exports = {
  createReview,
  findReviewById,
  findByProduct,
  findByCustomerAndProduct,
  findByCustomerAndOrder,
  calculateAvgRating,
};
