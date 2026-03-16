import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import LoadingSpinner from "../../components/LoadingSpinner";

const STATUS_LABELS = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  completed: "Đã thanh toán",
  shipping: "Đang giao",
  delivered: "Hoàn tất",
  cancelled: "Hủy",
};

const getItemProductId = (item) => {
  if (!item?.productId) return "";
  if (typeof item.productId === "string") return item.productId;
  if (typeof item.productId === "object") {
    return item.productId._id?.toString?.() || "";
  }
  return String(item.productId);
};

const getItemName = (item) => item?.name || item?.productId?.name || "Sản phẩm";

const getItemImage = (item) =>
  item?.imageUrl || item?.productId?.images?.[0] || "/placeholder.jpg";

const formatMoney = (value = 0) =>
  `${Number(value || 0).toLocaleString("vi-VN")}₫`;

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    productId: "",
    rating: 5,
    comment: "",
  });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [myReviews, setMyReviews] = useState([]);

  const loadData = async () => {
    try {
      const res = await axiosClient.get(`/orders/${id}`);
      const orderData = res.data.data;
      setOrder(orderData);

      // Load tất cả reviews của user trong đơn hàng này
      try {
        const reviewRes = await axiosClient.get(`/reviews/my-order/${id}`);
        const reviews = reviewRes.data.data || [];
        // Gắn tên sản phẩm từ order items nếu productId không populate đủ
        const enriched = reviews.map((r) => {
          const matchItem = orderData.items.find(
            (item) =>
              getItemProductId(item) ===
              (r.productId?._id || r.productId)?.toString(),
          );
          return {
            ...r,
            productName: r.productId?.name || getItemName(matchItem) || "",
          };
        });
        setMyReviews(enriched);
      } catch {
        setMyReviews([]);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleReviewSubmit = async () => {
    if (!reviewForm.productId) {
      alert("Chọn sản phẩm để đánh giá");
      return;
    }

    try {
      setReviewLoading(true);
      await axiosClient.post("/reviews", {
        productId: reviewForm.productId,
        orderId: id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      alert("Cảm ơn bạn đã đánh giá!");
      setReviewForm({ productId: "", rating: 5, comment: "" });
      // Refresh để cập nhật lịch sử đánh giá
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCancel = async () => {
    if (window.confirm("Xác nhận hủy đơn hàng?")) {
      try {
        const res = await axiosClient.patch(`/orders/${id}/cancel`);
        setOrder(res.data.data);
        alert("Đơn hàng đã được hủy");
      } catch (err) {
        alert(err.response?.data?.message || "Lỗi");
      }
    }
  };

  const handlePayNow = async () => {
    try {
      setPaymentLoading(true);
      const res = await axiosClient.post("/payments/initiate", {
        orderId: order._id,
        method: order.paymentMethod || "vnpay",
      });

      const paymentUrl = res.data?.data?.paymentUrl;
      if (!paymentUrl) {
        throw new Error("Không nhận được đường dẫn thanh toán");
      }

      window.location.href = paymentUrl;
    } catch (err) {
      alert(err.response?.data?.message || "Không thể khởi tạo thanh toán");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return <div>Không tìm thấy đơn hàng</div>;

  const shippingLines =
    order.shippingAddress && typeof order.shippingAddress === "object"
      ? [
          order.shippingAddress.fullName,
          order.shippingAddress.phone || order.shippingPhone,
          order.shippingAddress.address,
          order.shippingAddress.city,
        ].filter(Boolean)
      : [order.shippingAddress, order.shippingPhone].filter(Boolean);

  const displayStatus = STATUS_LABELS[order.status] || order.status || "N/A";
  const isPendingOrder =
    order.status === "pending" || order.status === "Chờ thanh toán";

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to="/"
        className="btn-primary fixed left-8 top-28 z-40 hidden lg:inline-flex px-4 py-2 shadow-lg"
      >
        Quay về trang chủ
      </Link>
      <Link
        to="/"
        className="btn-primary fixed right-4 bottom-4 z-40 inline-flex lg:hidden px-4 py-2 shadow-lg"
      >
        Trang chủ
      </Link>
      <h1 className="text-3xl font-bold mb-6">Chi tiết đơn hàng</h1>

      {/* Order info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="font-bold mb-3">Thông tin đơn hàng</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Mã đơn:</span> {order._id}
            </div>
            <div>
              <span className="text-gray-500">Ngày đặt:</span>{" "}
              {new Date(order.createdAt).toLocaleDateString("vi-VN")}
            </div>
            <div>
              <span className="text-gray-500">Trạng thái:</span>{" "}
              <span className="font-semibold text-primary">
                {displayStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold mb-3">Địa chỉ giao hàng</h3>
          <div className="text-sm space-y-1">
            {shippingLines.length > 0 ? (
              shippingLines.map((line, idx) => <div key={idx}>{line}</div>)
            ) : (
              <div className="text-gray-500">Chưa có thông tin giao hàng</div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card p-6 mb-8">
        <h3 className="font-bold mb-4">Sản phẩm</h3>
        <div className="space-y-3">
          {order.items.map((item, idx) => {
            const productId = getItemProductId(item);
            const itemName = getItemName(item);
            const itemImage = getItemImage(item);
            const lineTotal = item.unitPrice * item.quantity;

            return (
              <div
                key={item._id || `${productId || "product"}-${idx}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={itemImage}
                    alt={itemName}
                    className="w-16 h-16 rounded-md object-cover border border-gray-200"
                  />
                  <div>
                    <div className="font-semibold leading-6">{itemName}</div>
                    {productId && (
                      <div className="text-xs text-gray-500 mt-1">
                        Mã SP: {productId}
                      </div>
                    )}
                    <div className="text-sm text-gray-500 mt-1">
                      {formatMoney(item.unitPrice)} x {item.quantity}
                    </div>
                    {productId && (
                      <Link
                        to={`/products/${productId}`}
                        className="text-sm text-primary hover:underline inline-block mt-1"
                      >
                        Xem chi tiết sản phẩm
                      </Link>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Thành tiền</div>
                  <div className="font-semibold text-lg">
                    {formatMoney(lineTotal)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="card p-6 mb-8">
        <div className="space-y-2 text-right">
          <div className="flex justify-between">
            <span>Tổng tiền hàng:</span>
            <span className="font-semibold">
              {order.subtotal.toLocaleString("vi-VN")}₫
            </span>
          </div>
          <div className="flex justify-between">
            <span>Phí vận chuyển:</span>
            <span className="font-semibold">
              {order.shippingFee.toLocaleString("vi-VN")}₫
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold text-primary border-t pt-2">
            <span>Tổng cộng:</span>
            <span>
              {(order.subtotal + order.shippingFee).toLocaleString("vi-VN")}₫
            </span>
          </div>
        </div>
      </div>

      {/* Lịch sử đánh giá */}
      {myReviews.length > 0 && (
        <div className="card p-6 mb-8">
          <h3 className="font-bold mb-4">Đánh giá của bạn</h3>
          <div className="space-y-4">
            {myReviews.map((r) => (
              <div key={r._id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{r.productName}</span>
                  <span className="text-yellow-500 text-sm">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                </div>
                <p className="text-gray-700 text-sm mb-1">{r.comment}</p>
                {r.imageUrl && (
                  <img
                    src={r.imageUrl}
                    alt=""
                    className="max-w-xs rounded mt-2"
                  />
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Đã đánh giá lúc:{" "}
                  {new Date(r.createdAt).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review section */}
      {(order.status === "Đã thanh toán" || order.status === "Hoàn tất") && (
        <div className="card p-6 mb-8">
          <h3 className="font-bold mb-4">Đánh giá sản phẩm</h3>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Chọn sản phẩm
              </label>
              <select
                value={reviewForm.productId}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, productId: e.target.value })
                }
                className="input-field"
              >
                <option value="">-- Chọn sản phẩm --</option>
                {order.items.map((item, idx) => {
                  const productId = getItemProductId(item);
                  if (!productId) return null;

                  return (
                    <option
                      key={item._id || `${productId}-${idx}`}
                      value={productId}
                    >
                      {getItemName(item)}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Đánh giá (sao)
              </label>
              <select
                value={reviewForm.rating}
                onChange={(e) =>
                  setReviewForm({
                    ...reviewForm,
                    rating: parseInt(e.target.value),
                  })
                }
                className="input-field"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)} ({n} sao)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Nhận xét
              </label>
              <textarea
                rows="3"
                value={reviewForm.comment}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, comment: e.target.value })
                }
                placeholder="Chia sẻ nhận xét của bạn..."
                className="input-field"
              />
            </div>

            <button
              onClick={handleReviewSubmit}
              disabled={reviewLoading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {reviewLoading ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </div>
        </div>
      )}

      {/* Pending order actions */}
      {isPendingOrder && (
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handlePayNow}
              disabled={paymentLoading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {paymentLoading
                ? "Đang chuyển đến thanh toán..."
                : "Thanh toán ngay"}
            </button>
            <button onClick={handleCancel} className="btn-secondary w-full">
              Hủy đơn hàng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
