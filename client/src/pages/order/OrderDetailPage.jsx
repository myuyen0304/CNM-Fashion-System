import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import LoadingSpinner from "../../components/LoadingSpinner";
import {
  getOrderDisplayStatus,
  normalizeOrderStatus,
} from "../../utils/orderStatus";

const LEGACY_STATUS_TO_KEY = {
  "Ch? thanh toÃ¡n": "pending",
  "ÃÃ£ thanh toÃ¡n": "paid",
  "ÄÃ£ thanh toÃ¡n": "paid",
  "Ãang giao": "shipping",
  "Äang giao": "shipping",
  "HoÃ n t?t": "delivered",
  "H?y": "cancelled",
};

const normalizeStatusKey = (status) => {
  if (!status) return "";
  if (STATUS_LABELS[status]) return status;
  return LEGACY_STATUS_TO_KEY[status] || status;
};

const getItemProductId = (item) => {
  if (!item?.productId) return "";
  if (typeof item.productId === "string") return item.productId;
  if (typeof item.productId === "object") {
    return item.productId._id?.toString?.() || "";
  }
  return String(item.productId);
};

const getItemName = (item) => item?.name || item?.productId?.name || "Sáº£n pháº©m";

const getItemImage = (item) =>
  item?.imageUrl || item?.productId?.images?.[0] || "/placeholder.jpg";

const formatMoney = (value = 0) =>
  `${Number(value || 0).toLocaleString("vi-VN")}â‚«`;

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

      // Load táº¥t cáº£ reviews cá»§a user trong Ä‘Æ¡n hÃ ng nÃ y
      try {
        const reviewRes = await axiosClient.get(`/reviews/my-order/${id}`);
        const reviews = reviewRes.data.data || [];
        // Gáº¯n tÃªn sáº£n pháº©m tá»« order items náº¿u productId khÃ´ng populate Ä‘á»§
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
      alert("Chá»n sáº£n pháº©m Ä‘á»ƒ Ä‘Ã¡nh giÃ¡");
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
      alert("Cáº£m Æ¡n báº¡n Ä‘Ã£ Ä‘Ã¡nh giÃ¡!");
      setReviewForm({ productId: "", rating: 5, comment: "" });
      // Refresh Ä‘á»ƒ cáº­p nháº­t lá»‹ch sá»­ Ä‘Ã¡nh giÃ¡
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Lá»—i");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCancel = async () => {
    if (window.confirm("XÃ¡c nháº­n há»§y Ä‘Æ¡n hÃ ng?")) {
      try {
        const res = await axiosClient.patch(`/orders/${id}/cancel`);
        setOrder(res.data.data);
        alert("ÄÆ¡n hÃ ng Ä‘Ã£ Ä‘Æ°á»£c há»§y");
      } catch (err) {
        alert(err.response?.data?.message || "Lá»—i");
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
        throw new Error("KhÃ´ng nháº­n Ä‘Æ°á»£c Ä‘Æ°á»ng dáº«n thanh toÃ¡n");
      }

      window.location.href = paymentUrl;
    } catch (err) {
      alert(err.response?.data?.message || "KhÃ´ng thá»ƒ khá»Ÿi táº¡o thanh toÃ¡n");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return <div>KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng</div>;

  const shippingLines =
    order.shippingAddress && typeof order.shippingAddress === "object"
      ? [
          order.shippingAddress.fullName,
          order.shippingAddress.phone || order.shippingPhone,
          order.shippingAddress.address,
          order.shippingAddress.city,
        ].filter(Boolean)
      : [order.shippingAddress, order.shippingPhone].filter(Boolean);

  const normalizedStatus = normalizeOrderStatus(order.status);
  const displayStatus = getOrderDisplayStatus(order.status);
  const isPendingOrder = normalizedStatus === "pending";
  const isReviewableStatus =
    normalizedStatus === "paid" || normalizedStatus === "delivered";

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Chi tiáº¿t Ä‘Æ¡n hÃ ng</h1>

      {/* Order info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="font-bold mb-3">ThÃ´ng tin Ä‘Æ¡n hÃ ng</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">MÃ£ Ä‘Æ¡n:</span> {order._id}
            </div>
            <div>
              <span className="text-gray-500">NgÃ y Ä‘áº·t:</span>{" "}
              {new Date(order.createdAt).toLocaleDateString("vi-VN")}
            </div>
            <div>
              <span className="text-gray-500">Tráº¡ng thÃ¡i:</span>{" "}
              <span className="font-semibold text-primary">
                {displayStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-bold mb-3">Äá»‹a chá»‰ giao hÃ ng</h3>
          <div className="text-sm space-y-1">
            {shippingLines.length > 0 ? (
              shippingLines.map((line, idx) => <div key={idx}>{line}</div>)
            ) : (
              <div className="text-gray-500">ChÆ°a cÃ³ thÃ´ng tin giao hÃ ng</div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card p-6 mb-8">
        <h3 className="font-bold mb-4">Sáº£n pháº©m</h3>
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
                        MÃ£ SP: {productId}
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
                        Xem chi tiáº¿t sáº£n pháº©m
                      </Link>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">ThÃ nh tiá»n</div>
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
            <span>Tá»•ng tiá»n hÃ ng:</span>
            <span className="font-semibold">
              {order.subtotal.toLocaleString("vi-VN")}â‚«
            </span>
          </div>
          <div className="flex justify-between">
            <span>PhÃ­ váº­n chuyá»ƒn:</span>
            <span className="font-semibold">
              {order.shippingFee.toLocaleString("vi-VN")}â‚«
            </span>
          </div>
          <div className="flex justify-between text-lg font-bold text-primary border-t pt-2">
            <span>Tá»•ng cá»™ng:</span>
            <span>
              {(order.subtotal + order.shippingFee).toLocaleString("vi-VN")}â‚«
            </span>
          </div>
        </div>
      </div>

      {/* Lá»‹ch sá»­ Ä‘Ã¡nh giÃ¡ */}
      {myReviews.length > 0 && (
        <div className="card p-6 mb-8">
          <h3 className="font-bold mb-4">ÄÃ¡nh giÃ¡ cá»§a báº¡n</h3>
          <div className="space-y-4">
            {myReviews.map((r) => (
              <div key={r._id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{r.productName}</span>
                  <span className="text-yellow-500 text-sm">
                    {"â˜…".repeat(r.rating)}
                    {"â˜†".repeat(5 - r.rating)}
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
                  ÄÃ£ Ä‘Ã¡nh giÃ¡ lÃºc:{" "}
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
      {isReviewableStatus && (
        <div className="card p-6 mb-8">
          <h3 className="font-bold mb-4">ÄÃ¡nh giÃ¡ sáº£n pháº©m</h3>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Chá»n sáº£n pháº©m
              </label>
              <select
                value={reviewForm.productId}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, productId: e.target.value })
                }
                className="input-field"
              >
                <option value="">-- Chá»n sáº£n pháº©m --</option>
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
                ÄÃ¡nh giÃ¡ (sao)
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
                    {"â˜…".repeat(n)} ({n} sao)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Nháº­n xÃ©t
              </label>
              <textarea
                rows="3"
                value={reviewForm.comment}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, comment: e.target.value })
                }
                placeholder="Chia sáº» nháº­n xÃ©t cá»§a báº¡n..."
                className="input-field"
              />
            </div>

            <button
              onClick={handleReviewSubmit}
              disabled={reviewLoading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {reviewLoading ? "Äang gá»­i..." : "Gá»­i Ä‘Ã¡nh giÃ¡"}
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
                ? "Äang chuyá»ƒn Ä‘áº¿n thanh toÃ¡n..."
                : "Thanh toÃ¡n ngay"}
            </button>
            <button onClick={handleCancel} className="btn-secondary w-full">
              Há»§y Ä‘Æ¡n hÃ ng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
