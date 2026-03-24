import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

const LEGACY_STATUS_TO_KEY = {
  "Ch? thanh toán": "pending",
  "Ðã thanh toán": "paid",
  "Đã thanh toán": "paid",
  "Ðang giao": "shipping",
  "Đang giao": "shipping",
  "Hoàn t?t": "delivered",
  "H?y": "cancelled",
};

const normalizeStatusKey = (status) => {
  if (!status) return "";
  if (STATUS_LABELS[status]) return status;
  return LEGACY_STATUS_TO_KEY[status] || status;
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get(`/orders?page=${page}`);
        setOrders(res.data.data.orders);
        setTotalPages(res.data.data.totalPages);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [page]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Lịch sử đơn hàng</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Chưa có đơn hàng</p>
          <Link to="/" className="btn-primary">
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => {
              const normalizedStatus = normalizeStatusKey(order.status);
              const statusColor =
                normalizedStatus === "delivered" ||
                normalizedStatus === "completed"
                  ? "text-green-600"
                  : normalizedStatus === "cancelled"
                    ? "text-red-600"
                    : "text-blue-600";

              return (
                <div
                  key={order._id}
                  className="card p-6 hover:shadow-lg transition"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500">Mã đơn hàng</div>
                    <div className="font-semibold">{order._id}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Ngày đặt</div>
                    <div className="font-semibold">
                      {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Tổng tiền</div>
                    <div className="font-semibold text-primary">
                      {(order.subtotal + order.shippingFee).toLocaleString(
                        "vi-VN",
                      )}
                      ₫
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Trạng thái</div>
                    <div className={`font-semibold ${statusColor}`}>
                      {STATUS_LABELS[normalizedStatus] || normalizedStatus || "N/A"}
                    </div>
                  </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    {order.items.length} sản phẩm
                  </div>

                  <Link
                    to={`/order-detail/${order._id}`}
                    className="text-primary hover:underline font-semibold"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-primary text-primary rounded disabled:opacity-50"
              >
                Trước
              </button>
              <span className="px-4 py-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-primary text-primary rounded disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
