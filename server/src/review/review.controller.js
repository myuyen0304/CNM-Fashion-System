const reviewService = require("./review.service");
const catchAsync = require("../../shared/utils/catchAsync");

const createReview = catchAsync(async (req, res) => {
  const review = await reviewService.createReview(
    req.user._id,
    req.body,
    req.file,
  );
  res.status(201).json({ success: true, data: review });
});

const getProductReviews = catchAsync(async (req, res) => {
  const result = await reviewService.getProductReviews(
    req.params.productId,
    parseInt(req.query.page) || 1,
  );
  res.json({ success: true, data: result });
});

const checkCanReview = catchAsync(async (req, res) => {
  const result = await reviewService.checkCanReview(
    req.user._id,
    req.params.productId,
  );
  res.json({ success: true, data: result });
});

const getReviewsByOrder = catchAsync(async (req, res) => {
  const reviews = await reviewService.getReviewsByOrder(
    req.user._id,
    req.params.orderId,
  );
  res.json({ success: true, data: reviews });
});

module.exports = {
  createReview,
  getProductReviews,
  checkCanReview,
  getReviewsByOrder,
};
