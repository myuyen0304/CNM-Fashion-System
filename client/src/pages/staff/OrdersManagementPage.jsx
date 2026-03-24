import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/LoadingSpinner";
import StaffLayout from "../../components/StaffLayout";

const ORDER_STATUSES = [
  "Chờ thanh toán",
  "Đã thanh toán",
  "Đang giao",
  "Hoàn tất",
  "Hủy",
];

const RETURN_ACTIONS = [
  { value: "request", label: "Request return" },
  { value: "approve", label: "Approve return" },
  { value: "reject", label: "Reject return" },
  { value: "complete", label: "Complete return" },
];

export default function OrdersManagementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [period, setPeriod] = useState("day");
  const [revenue, setRevenue] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const canViewRevenue =
    user?.role === "admin" || user?.role === "supervisor";
  const canHandleReturn = user?.role === "admin" || user?.role === "employee";

  const loadOrders = async (targetPage = page) => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/orders/admin/list", {
        params: {
          page: targetPage,
          limit: 20,
          status: statusFilter || undefined,
          paymentMethod: paymentFilter || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        },
      });
      const data = res.data?.data || {};
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      alert(err.response?.data?.message || "Cannot load orders");
    } finally {
      setLoading(false);
    }
  };

  const loadRevenue = async (nextPeriod = period) => {
    if (!canViewRevenue) return;
    try {
      const res = await axiosClient.get("/orders/admin/revenue-summary", {
        params: { period: nextPeriod },
      });
      setRevenue(res.data?.data || null);
    } catch (err) {
      alert(err.response?.data?.message || "Cannot load revenue");
    }
  };

  useEffect(() => {
    loadOrders(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, paymentFilter, fromDate, toDate]);

  useEffect(() => {
    loadRevenue(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, canViewRevenue]);

  const updateStatus = async (orderId, status) => {
    if (!window.confirm(`Update order status to "${status}"?`)) return;
    try {
      await axiosClient.patch(`/orders/${orderId}/status`, { status });
      loadOrders(page);
    } catch (err) {
      alert(err.response?.data?.message || "Cannot update order status");
    }
  };

  const handleReturn = async (orderId, action) => {
    if (!window.confirm(`Apply return action "${action}" for this order?`)) return;
    const reason =
      action === "request"
        ? window.prompt("Return reason:", "Customer return request") || ""
        : "";
    if (action === "request" && !reason.trim()) return;

    try {
      await axiosClient.patch(`/orders/${orderId}/return`, {
        action,
        reason,
      });
      loadOrders(page);
    } catch (err) {
      alert(err.response?.data?.message || "Cannot handle return");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <StaffLayout
      title="Staff - Orders Management"
      subtitle="Cập nhật trạng thái đơn, xử lý đổi trả, xem doanh thu"
    >
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="input-field"
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All payments</option>
            <option value="VNPay">VNPay</option>
            <option value="MoMo">MoMo</option>
            <option value="PayPal">PayPal</option>
          </select>
          <input
            type="date"
            className="input-field"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
          <input
            type="date"
            className="input-field"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
          <button
            className="btn-secondary"
            onClick={() => {
              setStatusFilter("");
              setPaymentFilter("");
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {canViewRevenue && (
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-4 mb-3">
            <label className="font-semibold">Revenue period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="input-field max-w-[180px]"
            >
              <option value="day">Day</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded p-4">
              <div className="text-sm text-gray-600">Total revenue</div>
              <div className="text-xl font-bold text-primary">
                {(revenue?.totalRevenue || 0).toLocaleString("vi-VN")}₫
              </div>
            </div>
            <div className="bg-green-50 rounded p-4">
              <div className="text-sm text-gray-600">Total paid orders</div>
              <div className="text-xl font-bold text-green-700">
                {revenue?.totalOrders || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Order</th>
              <th className="text-left py-3 px-4">Customer</th>
              <th className="text-left py-3 px-4">Total</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Return</th>
              <th className="text-left py-3 px-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id} className="border-b">
                <td className="py-3 px-4">
                  <div className="font-medium">{order._id}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleString("vi-VN")}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div>{order.customerId?.name || "N/A"}</div>
                  <div className="text-xs text-gray-500">
                    {order.customerId?.email || ""}
                  </div>
                </td>
                <td className="py-3 px-4">{order.total.toLocaleString("vi-VN")}₫</td>
                <td className="py-3 px-4">
                  <select
                    value={order.status}
                    className="border rounded px-2 py-1"
                    onChange={(e) => updateStatus(order._id, e.target.value)}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-4">
                  {order.returnRequest?.status || "none"}
                </td>
                <td className="py-3 px-4">
                  {canHandleReturn ? (
                    <div className="flex gap-2 flex-wrap">
                      {RETURN_ACTIONS.map((item) => (
                        <button
                          key={item.value}
                          className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                          onClick={() => handleReturn(order._id, item.value)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No return permission</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            className="btn-secondary px-4 py-2 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Prev
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            className="btn-secondary px-4 py-2 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      )}
    </StaffLayout>
  );
}
