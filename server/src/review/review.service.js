const ApiError = require("../shared/utils/ApiError");
const { ORDER_STATUS } = require("../shared/constants");
const reviewRepo = require("./review.repository");
const orderRepo = require("../modules/order/order.repository");
const Product = require("../modules/product/product.model");
const productRepo = require("../modules/product/product.repository");
const { uploadToCloudinary } = require("../config/cloudinary");

/**
 * UC-09: Đánh giá sản phẩm
 * Điều kiện: đơn hàng phải Hoàn tất, chưa review sản phẩm này
 */
const createReview = async (
  customerId,
  { productId, orderId, rating, comment },
  file,
) => {
  if (!productId || !orderId || !rating) {
    throw new ApiError(
      400,
      "Vui lòng cung cấp sản phẩm, đơn hàng và điểm đánh giá.",
    );
  }

  if (rating < 1 || rating > 5) {
    throw new ApiError(400, "Điểm đánh giá phải từ 1 đến 5.");
  }

  // Kiểm tra sản phẩm tồn tại
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Không tìm thấy sản phẩm.");
  }

  // Kiểm tra đơn hàng của customer
  const order = await orderRepo.findOrderById(orderId);
  const orderCustomerId = order?.customerId?._id ?? order?.customerId;
  if (!order || orderCustomerId.toString() !== customerId.toString()) {
    throw new ApiError(404, "Không tìm thấy đơn hàng.");
  }

  // Kiểm tra trạng thái đơn hàng = Đã thanh toán hoặc Hoàn tất
  // Cho phép đánh giá ngay sau khi thanh toán hoặc khi hoàn tất
  if (
    order.status !== ORDER_STATUS.PAID &&
    order.status !== ORDER_STATUS.COMPLETED
  ) {
    throw new ApiError(400, "Chỉ có thể đánh giá khi đơn hàng đã thanh toán.");
  }

  // Kiểm tra đã review chưa
  const existingReview = await reviewRepo.findByCustomerAndProduct(
    customerId,
    productId,
    orderId,
  );
  if (existingReview) {
    throw new ApiError(
      400,
      "Bạn đã đánh giá sản phẩm này qua đơn hàng này rồi.",
    );
  }

  // Upload ảnh review nếu có
  let imageUrl = null;
  if (file) {
    imageUrl = await uploadToCloudinary(file.buffer, "ecommerce/reviews");
  }

  // Tạo review
  const review = await reviewRepo.createReview({
    productId,
    customerId,
    orderId,
    rating,
    comment: comment || "",
    imageUrl,
  });

  // Cập nhật avgRating của product
  const stats = await reviewRepo.calculateAvgRating(productId);
  await productRepo.updateAvgRating(
    productId,
    Math.round(stats.avgRating * 10) / 10,
  );

  return review;
};

/**
 * Lấy review của product
 */
const getProductReviews = async (productId, page = 1) => {
  return reviewRepo.findByProduct(productId, page);
};

/**
 * Lấy tất cả review của customer trong 1 đơn hàng
 */
const getReviewsByOrder = async (customerId, orderId) => {
  return reviewRepo.findByCustomerAndOrder(customerId, orderId);
};

/**
 * Kiểm tra có thể đánh giá sản phẩm không
 * Trả về danh sách các đơn hàng có chứa sản phẩm và chưa được review
 */
const checkCanReview = async (customerId, productId) => {
  try {
    // Lấy tất cả đơn hàng của customer có status là PAID hoặc COMPLETED
    const orders = await orderRepo.findOrdersByCustomer(customerId, 1, 100);

    const reviewableOrders = [];

    for (const order of orders.orders) {
      // Kiểm tra đơn hàng có chứa sản phẩm không
      const hasProduct = order.items.some(
        (item) => item.productId.toString() === productId.toString(),
      );

      if (!hasProduct) continue;

      // Kiểm tra đơn hàng có status là PAID hoặc COMPLETED
      if (
        order.status !== ORDER_STATUS.PAID &&
        order.status !== ORDER_STATUS.COMPLETED
      ) {
        continue;
      }

      // Kiểm tra đã review sản phẩm này qua đơn hàng này chưa
      const existingReview = await reviewRepo.findByCustomerAndProduct(
        customerId,
        productId,
        order._id,
      );

      if (!existingReview) {
        reviewableOrders.push({
          orderId: order._id,
          status: order.status,
          createdAt: order.createdAt,
        });
      }
    }

    return {
      canReview: reviewableOrders.length > 0,
      orders: reviewableOrders,
    };
  } catch (err) {
    console.error("Error in checkCanReview:", err);
    return { canReview: false, orders: [] };
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getReviewsByOrder,
  checkCanReview,
};
