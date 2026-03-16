import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [reviewableProducts, setReviewableProducts] = useState([]);
  const [totalReviewable, setTotalReviewable] = useState(0);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (orderId) {
        try {
          const [orderRes, reviewsRes] = await Promise.all([
            axiosClient.get(`/orders/${orderId}`),
            axiosClient.get(`/reviews/my-order/${orderId}`).catch(() => null),
          ]);

          const orderData = orderRes?.data?.data;
          setOrder(orderData);

          // Chỉ hiện modal khi thanh toán thành công và còn sản phẩm chưa review trong đúng đơn hiện tại.
          if (status === "success" && orderData?.items?.length > 0) {
            const reviewedProductIds = new Set(
              (reviewsRes?.data?.data || []).map((review) =>
                String(review?.productId?._id || review?.productId),
              ),
            );

            const products = orderData.items
              .filter((item) => !reviewedProductIds.has(String(item.productId)))
              .map((item) => ({
                productId: item.productId,
                name: item.name,
                imageUrl: item.imageUrl,
                unitPrice: item.unitPrice,
              }));

            setReviewableProducts(products);
            setTotalReviewable(products.length);
            setShowRatingModal(products.length > 0);
          }
        } catch (err) {
          console.error("Error:", err);
        }
      }
      setLoading(false);
    };

    fetch();
  }, [orderId, status]);

  const handleReviewSubmit = async () => {
    if (reviewableProducts.length === 0) return;

    try {
      setReviewLoading(true);
      const product = reviewableProducts[0];

      await axiosClient.post("/reviews", {
        productId: product.productId,
        orderId: orderId,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });

      setReviewForm({ rating: 5, comment: "" });

      setReviewableProducts((prev) => {
        const next = prev.slice(1);
        setShowRatingModal(next.length > 0);
        return next;
      });
    } catch (err) {
      const message = err.response?.data?.message || "Lỗi khi gửi đánh giá";

      // Nếu backend báo đã đánh giá rồi thì tự bỏ qua sản phẩm này để không bị lặp modal.
      if (message.toLowerCase().includes("đã đánh giá")) {
        setReviewableProducts((prev) => {
          const next = prev.slice(1);
          setShowRatingModal(next.length > 0);
          return next;
        });
        return;
      }

      alert(message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSkipProduct = () => {
    setReviewForm({ rating: 5, comment: "" });
    setReviewableProducts((prev) => {
      const next = prev.slice(1);
      setShowRatingModal(next.length > 0);
      return next;
    });
  };

  const handleCloseModal = () => {
    setShowRatingModal(false);
  };

  if (loading) return <div className="text-center py-12">Đang xử lý...</div>;

  const currentProduct =
    reviewableProducts.length > 0 ? reviewableProducts[0] : null;

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      {status === "success" ? (
        <>
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold text-green-600 mb-4">
            Thanh toán thành công!
          </h1>
          <p className="text-gray-600 mb-6">
            Cảm ơn bạn đã mua hàng. Đơn hàng sẽ được giao sớm nhất.
          </p>

          {order && (
            <div className="card p-6 mb-6 text-left">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Mã đơn hàng:</span>
                  <span className="font-semibold">{order._id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tổng tiền:</span>
                  <span className="font-semibold text-primary">
                    {(order.subtotal + order.shippingFee).toLocaleString(
                      "vi-VN",
                    )}
                    ₫
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Trạng thái:</span>
                  <span className="font-semibold">Đã thanh toán</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to={`/order-detail/${orderId}`}
              className="block btn-primary py-3"
            >
              Xem chi tiết đơn hàng
            </Link>
            <Link to="/orders" className="block btn-secondary py-3">
              Lịch sử đơn hàng
            </Link>
            <Link to="/" className="block text-gray-600 hover:text-primary">
              Tiếp tục mua sắm
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="text-6xl mb-4">✕</div>
          <h1 className="text-3xl font-bold text-red-600 mb-4">
            Thanh toán thất bại
          </h1>
          <p className="text-gray-600 mb-6">
            Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.
          </p>

          <div className="space-y-3">
            <Link to="/checkout" className="block btn-primary py-3">
              Quay lại thanh toán
            </Link>
            <Link to="/orders" className="block btn-secondary py-3">
              Lịch sử đơn hàng
            </Link>
            <Link to="/" className="block text-gray-600 hover:text-primary">
              Trang chủ
            </Link>
          </div>
        </>
      )}

      {/* Rating Modal */}
      {showRatingModal && currentProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                Đánh giá sản phẩm (
                {totalReviewable - reviewableProducts.length + 1}/
                {totalReviewable})
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              {currentProduct.imageUrl && (
                <img
                  src={currentProduct.imageUrl}
                  alt={currentProduct.name}
                  className="w-full h-40 object-cover rounded mb-3"
                />
              )}
              <h4 className="font-semibold text-lg mb-2">
                {currentProduct.name}
              </h4>
              <p className="text-gray-500 text-sm">
                {currentProduct.unitPrice.toLocaleString("vi-VN")}₫
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-3">
                  Bạn đánh giá sao?
                </label>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() =>
                        setReviewForm({ ...reviewForm, rating: star })
                      }
                      className={`text-3xl transition ${
                        star <= reviewForm.rating
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nhận xét (tùy chọn)
                </label>
                <textarea
                  rows="3"
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, comment: e.target.value })
                  }
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  className="input-field w-full"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkipProduct}
                className="flex-1 btn-secondary py-2"
              >
                Bỏ qua
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={reviewLoading}
                className="flex-1 btn-primary py-2 disabled:opacity-50"
              >
                {reviewLoading ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
