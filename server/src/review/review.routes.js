const express = require("express");
const router = express.Router();
const reviewController = require("./review.controller");
const upload = require("../../shared/middleware/upload");
const { protect } = require("../../shared/middleware/authMiddleware");

// Public endpoint: cho phép khách xem đánh giá sản phẩm.
router.get("/product/:productId", reviewController.getProductReviews);

// Protected endpoints: yêu cầu đăng nhập.
router.post(
  "/",
  protect,
  upload.single("image"),
  reviewController.createReview,
);
router.get("/can-review/:productId", protect, reviewController.checkCanReview);
router.get("/my-order/:orderId", protect, reviewController.getReviewsByOrder);

module.exports = router;
