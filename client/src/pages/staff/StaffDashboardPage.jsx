import { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../contexts/AuthContext";
import StaffLayout from "../../components/StaffLayout";

const PERIOD_OPTIONS = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
];

const CHART_HEIGHT = 180;

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

const formatNumber = (value) => Number(value || 0).toLocaleString("vi-VN");

const formatCompactCurrency = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)} tỷ`;
  if (amount >= 1000000) return `${Math.round(amount / 1000000)} tr`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return `${amount}`;
};

const formatBucket = (bucket, period) => {
  if (!bucket) return "-";
  if (period === "week") return `Tuần ${String(bucket).replace("-W", " / ")}`;
  if (period === "month") {
    const [year, month] = String(bucket).split("-");
    return month && year ? `Tháng ${month}/${year}` : bucket;
  }
  if (period === "year") return `Năm ${bucket}`;
  return new Date(`${bucket}T00:00:00`).toLocaleDateString("vi-VN");
};

const formatChartLabel = (bucket, period) => {
  if (!bucket) return "";
  if (period === "week") return String(bucket).split("-W")[1] || bucket;
  if (period === "month") return String(bucket).split("-")[1] || bucket;
  if (period === "year") return bucket;
  return String(bucket).split("-")[2] || bucket;
};

function StatCard({ label, value, tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "text-amber-600"
      : tone === "success"
        ? "text-emerald-600"
        : "text-gray-900";

  return (
    <div className="rounded-2xl bg-white p-5 shadow-md">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function PeriodControls({ period, setPeriod, from, setFrom, to, setTo }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="inline-flex overflow-hidden rounded-xl bg-white p-1 shadow-sm">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPeriod(option.value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              period === option.value
                ? "bg-gray-900 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-10 w-36 rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
          aria-label="Từ ngày"
        />
        <span className="text-gray-400">-</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-10 w-36 rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
          aria-label="Đến ngày"
        />
      </div>
    </div>
  );
}

function BarChart({
  rows,
  maxValue,
  period,
  getValue,
  getTitle,
  getLabel,
  barColor,
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[680px]">
        <div>
          <div
            className="relative border-b border-gray-200"
            style={{ height: CHART_HEIGHT }}
          >
            <div className="absolute inset-x-0 top-0 border-t border-gray-200" />
            <div className="absolute inset-x-0 top-1/2 border-t border-gray-200" />
            <div className="absolute inset-x-0 bottom-0 border-t border-gray-200" />

            <div className="absolute inset-0 flex items-end gap-4 px-3">
              {rows.map((row) => {
                const value = Number(getValue(row) || 0);
                const barHeight =
                  maxValue > 0
                    ? Math.max((value / maxValue) * CHART_HEIGHT, 14)
                    : 0;

                return (
                  <div
                    key={row.bucket}
                    className="flex min-w-16 flex-1 flex-col items-center justify-end"
                    style={{ height: CHART_HEIGHT }}
                  >
                    <div className="mb-2 text-xs font-semibold text-gray-700">
                      {getLabel(row)}
                    </div>
                    <div
                      className="w-full max-w-11 rounded-t-md shadow-md transition"
                      style={{
                        height: `${barHeight}px`,
                        backgroundColor: barColor,
                      }}
                      title={getTitle(row)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 px-3 pt-2">
            {rows.map((row) => (
              <div
                key={`${row.bucket}-label`}
                className="min-w-16 flex-1 text-center text-xs font-semibold text-gray-500"
              >
                {formatChartLabel(row.bucket, period)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const role = user?.role || "";
  const [revenuePeriod, setRevenuePeriod] = useState("day");
  const [productPeriod, setProductPeriod] = useState("day");
  const [revenueFrom, setRevenueFrom] = useState("");
  const [revenueTo, setRevenueTo] = useState("");
  const [productFrom, setProductFrom] = useState("");
  const [productTo, setProductTo] = useState("");
  const [revenueSummary, setRevenueSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    rows: [],
  });
  const [productStats, setProductStats] = useState({
    summary: {},
    lowStockThreshold: 10,
  });
  const [productSales, setProductSales] = useState({
    totalSold: 0,
    totalRevenue: 0,
    totalOrders: 0,
    rows: [],
    topProducts: [],
  });
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [revenueError, setRevenueError] = useState("");
  const [productError, setProductError] = useState("");

  const canViewDashboard = role === "admin" || role === "supervisor";

  useEffect(() => {
    if (!canViewDashboard) return;

    const loadRevenue = async () => {
      try {
        setLoadingRevenue(true);
        setRevenueError("");
        const params = { period: revenuePeriod };
        if (revenueFrom) params.from = revenueFrom;
        if (revenueTo) params.to = revenueTo;

        const res = await axiosClient.get("/orders/admin/revenue-summary", {
          params,
        });
        setRevenueSummary(
          res.data?.data || { totalRevenue: 0, totalOrders: 0, rows: [] },
        );
      } catch (err) {
        setRevenueError(
          err.response?.data?.message || "Không thể tải thống kê doanh thu.",
        );
      } finally {
        setLoadingRevenue(false);
      }
    };

    loadRevenue();
  }, [canViewDashboard, revenueFrom, revenuePeriod, revenueTo]);

  useEffect(() => {
    if (!canViewDashboard) return;

    const loadProductStats = async () => {
      try {
        const res = await axiosClient.get("/products/admin/stats", {
          params: { limit: 1, lowStockThreshold: 10 },
        });
        setProductStats(res.data?.data || { summary: {} });
      } catch (err) {
        setProductError(
          err.response?.data?.message || "Không thể tải thống kê sản phẩm.",
        );
      }
    };

    loadProductStats();
  }, [canViewDashboard]);

  useEffect(() => {
    if (!canViewDashboard) return;

    const loadProductSales = async () => {
      try {
        setLoadingProducts(true);
        setProductError("");
        const params = { period: productPeriod, limit: 8 };
        if (productFrom) params.from = productFrom;
        if (productTo) params.to = productTo;

        const res = await axiosClient.get("/orders/admin/product-sales-summary", {
          params,
        });
        setProductSales(
          res.data?.data || {
            totalSold: 0,
            totalRevenue: 0,
            totalOrders: 0,
            rows: [],
            topProducts: [],
          },
        );
      } catch (err) {
        setProductError(
          err.response?.data?.message || "Không thể tải sản phẩm đã bán.",
        );
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProductSales();
  }, [canViewDashboard, productFrom, productPeriod, productTo]);

  const revenueRows = revenueSummary.rows || [];
  const productRows = productSales.rows || [];
  const productSummary = productStats.summary || {};
  const topProducts = productSales.topProducts || [];
  const maxRevenue = useMemo(
    () => Math.max(...revenueRows.map((row) => row.totalRevenue || 0), 0),
    [revenueRows],
  );
  const maxProductSold = useMemo(
    () => Math.max(...productRows.map((row) => row.totalSold || 0), 0),
    [productRows],
  );
  const averageRevenue =
    revenueSummary.totalOrders > 0
      ? revenueSummary.totalRevenue / revenueSummary.totalOrders
      : 0;
  const activeRevenuePeriodLabel =
    PERIOD_OPTIONS.find((item) => item.value === revenuePeriod)?.label.toLowerCase() ||
    "ngày";
  const activeProductPeriodLabel =
    PERIOD_OPTIONS.find((item) => item.value === productPeriod)?.label.toLowerCase() ||
    "ngày";

  return (
    <StaffLayout
      title="DASH BOARD"
      subtitle={`Vai trò hiện tại: ${role || "chưa xác định"}`}
    >
      {canViewDashboard && (
        <div className="space-y-6">
          <section className="rounded-2xl bg-gray-100 p-4 md:p-6">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Thống kê doanh thu
                </h2>
                <p className="text-sm text-gray-500">
                  Tổng hợp các đơn đã thanh toán hoặc hoàn tất.
                </p>
              </div>

              <PeriodControls
                period={revenuePeriod}
                setPeriod={setRevenuePeriod}
                from={revenueFrom}
                setFrom={setRevenueFrom}
                to={revenueTo}
                setTo={setRevenueTo}
              />
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                label="Tổng doanh thu"
                value={formatCurrency(revenueSummary.totalRevenue)}
                tone="success"
              />
              <StatCard
                label="Số đơn tính doanh thu"
                value={formatNumber(revenueSummary.totalOrders)}
              />
              <StatCard
                label="Trung bình mỗi đơn"
                value={formatCurrency(averageRevenue)}
              />
            </div>

            {revenueError && (
              <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {revenueError}
              </div>
            )}

            <div className="rounded-2xl bg-white p-5 shadow-md">
              {loadingRevenue ? (
                <div className="py-16 text-center text-gray-500">
                  Đang tải thống kê...
                </div>
              ) : revenueRows.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  Chưa có doanh thu trong khoảng thời gian này.
                </div>
              ) : (
                <>
                  <BarChart
                    rows={revenueRows}
                    maxValue={maxRevenue}
                    period={revenuePeriod}
                    getValue={(row) => row.totalRevenue}
                    getTitle={(row) =>
                      `${formatBucket(row.bucket, revenuePeriod)}: ${formatCurrency(
                        row.totalRevenue,
                      )} / ${row.orderCount} đơn`
                    }
                    getLabel={(row) => formatCompactCurrency(row.totalRevenue)}
                    barColor="#22c55e"
                  />

                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <h3 className="text-base font-semibold text-gray-800">
                      Doanh thu theo {activeRevenuePeriodLabel}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Cao nhất {formatCurrency(maxRevenue)} trong dữ liệu đang lọc.
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-gray-100 p-4 md:p-6">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Thống kê sản phẩm đã bán
                </h2>
                <p className="text-sm text-gray-500">
                  Theo dõi tổng số sản phẩm bán ra theo ngày, tuần, tháng hoặc năm.
                </p>
              </div>

              <PeriodControls
                period={productPeriod}
                setPeriod={setProductPeriod}
                from={productFrom}
                setFrom={setProductFrom}
                to={productTo}
                setTo={setProductTo}
              />
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
              <StatCard
                label="Sản phẩm đã bán"
                value={formatNumber(productSales.totalSold)}
                tone="success"
              />
              <StatCard
                label="Doanh thu từ sản phẩm"
                value={formatCurrency(productSales.totalRevenue)}
              />
              <StatCard
                label="Tổng sản phẩm đang bán"
                value={formatNumber(productSummary.activeProducts)}
              />
              <StatCard
                label={`Sắp hết hàng (≤ ${productStats.lowStockThreshold || 10})`}
                value={formatNumber(productSummary.lowStockProducts)}
                tone="warning"
              />
            </div>

            {productError && (
              <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {productError}
              </div>
            )}

            <div className="rounded-2xl bg-white p-5 shadow-md">
              {loadingProducts ? (
                <div className="py-14 text-center text-gray-500">
                  Đang tải thống kê sản phẩm...
                </div>
              ) : productRows.length === 0 ? (
                <div className="py-14 text-center text-gray-500">
                  Chưa có sản phẩm đã bán trong khoảng thời gian này.
                </div>
              ) : (
                <>
                  <BarChart
                    rows={productRows}
                    maxValue={maxProductSold}
                    period={productPeriod}
                    getValue={(row) => row.totalSold}
                    getTitle={(row) =>
                      `${formatBucket(row.bucket, productPeriod)}: ${formatNumber(
                        row.totalSold,
                      )} sản phẩm / ${formatCurrency(row.totalRevenue)}`
                    }
                    getLabel={(row) => formatNumber(row.totalSold)}
                    barColor="#0ea5e9"
                  />

                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <h3 className="text-base font-semibold text-gray-800">
                      Sản phẩm đã bán theo {activeProductPeriodLabel}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Cao nhất {formatNumber(maxProductSold)} sản phẩm trong dữ liệu đang lọc.
                    </p>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead className="text-sm text-gray-500">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold">
                            Sản phẩm
                          </th>
                          <th className="px-3 py-3 text-left font-semibold">
                            Đã bán
                          </th>
                          <th className="px-3 py-3 text-left font-semibold">
                            Doanh thu
                          </th>
                          <th className="px-3 py-3 text-left font-semibold">
                            Số đơn
                          </th>
                          <th className="px-3 py-3 text-left font-semibold">
                            Rút gọn
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {topProducts.map((product) => (
                          <tr key={product.productId || product.name}>
                            <td className="px-3 py-3">
                              <div className="font-semibold text-gray-800">
                                {product.name || "Sản phẩm"}
                              </div>
                              <div className="text-xs text-gray-400">
                                {product.productId || "-"}
                              </div>
                            </td>
                            <td className="px-3 py-3 font-semibold text-gray-800">
                              {formatNumber(product.totalSold)}
                            </td>
                            <td className="px-3 py-3 text-gray-700">
                              {formatCurrency(product.totalRevenue)}
                            </td>
                            <td className="px-3 py-3 text-gray-700">
                              {formatNumber(product.orderCount)}
                            </td>
                            <td className="px-3 py-3 text-gray-500">
                              {formatCompactCurrency(product.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </StaffLayout>
  );
}
