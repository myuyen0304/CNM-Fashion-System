import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import LoadingSpinner from "../../components/LoadingSpinner";
import {
  getOrderDisplayStatus,
  normalizeOrderStatus,
} from "../../utils/orderStatus";

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
      <h1 className="text-3xl font-bold mb-8">Lá»‹ch sá»­ Ä‘Æ¡n hÃ ng</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">ChÆ°a cÃ³ Ä‘Æ¡n hÃ ng</p>
          <Link to="/" className="btn-primary">
            Tiáº¿p tá»¥c mua sáº¯m
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order._id}
                className="card p-6 hover:shadow-lg transition"
              >
                {(() => {
                  const normalizedStatus = normalizeOrderStatus(order.status);
                  const statusColorClass =
                    normalizedStatus === "delivered" ||
                    normalizedStatus === "completed" ||
                    normalizedStatus === "paid"
                      ? "text-green-600"
                      : normalizedStatus === "cancelled"
                        ? "text-red-600"
                        : "text-blue-600";

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-500">MÃ£ Ä‘Æ¡n hÃ ng</div>
                        <div className="font-semibold">{order._id}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">NgÃ y Ä‘áº·t</div>
                        <div className="font-semibold">
                          {new Date(order.createdAt).toLocaleDateString(
                            "vi-VN",
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Tá»•ng tiá»n</div>
                        <div className="font-semibold text-primary">
                          {(order.subtotal + order.shippingFee).toLocaleString(
                            "vi-VN",
                          )}
                          â‚«
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Tráº¡ng thÃ¡i</div>
                        <div className={`font-semibold ${statusColorClass}`}>
                          {getOrderDisplayStatus(order.status)}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                  <div className="text-sm text-gray-600 mb-4">
                    {order.items.length} sáº£n pháº©m
                  </div>

                  <Link
                    to={`/order-detail/${order._id}`}
                    className="text-primary hover:underline font-semibold"
                  >
                    Xem chi tiáº¿t â†’
                  </Link>
                </div>
              ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-primary text-primary rounded disabled:opacity-50"
              >
                TrÆ°á»›c
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
