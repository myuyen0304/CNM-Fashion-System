import { Link, useLocation } from "react-router-dom";

const ROUTE_LABELS = {
  home: "Trang chủ",
  shop: "Danh mục",
  "danh-muc": "Danh mục",
  "bo-suu-tap": "Bộ Sưu Tập",
  "tin-tuc-thoi-trang": "Tin Tức Thời Trang",
  "tin-tuc": "Tin Tức Thời Trang",
  "khuyen-mai": "Khuyến Mãi",
  "tro-giup": "Trợ Giúp",
  "ve-chung-toi": "Về Chúng Tôi",
  "cham-soc-khach-hang": "Chăm Sóc Khách Hàng",
  "tuyen-dung-viec-lam": "Tuyển Dụng & Việc Làm",
  "chinh-sach": "Chính Sách",
  search: "Tìm kiếm",
  products: "Chi Tiết Sản Phẩm",
  cart: "Giỏ hàng",
  checkout: "Thanh toán",
  orders: "Đơn hàng",
  "order-detail": "Chi tiết đơn hàng",
  profile: "Tài khoản",
  chat: "Trò chuyện",
};

const HIDE_PATHS = new Set(["/login", "/register", "/home", "/Home"]);

export default function BreadcrumbBar({ hidden }) {
  const { pathname } = useLocation();

  if (hidden || pathname === "/" || HIDE_PATHS.has(pathname)) return null;

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [{ label: "Trang chủ", to: "/home" }];

  let currentPath = "";
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    const lower = segment.toLowerCase();
    const prev = segments[i - 1]?.toLowerCase();
    const isDetailId = prev === "products" || prev === "order-detail";
    const label = isDetailId
      ? "Chi tiết"
      : ROUTE_LABELS[lower] || segment.replace(/-/g, " ");
    crumbs.push({ label, to: currentPath });
  }

  return (
    <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-gray-50 border-b border-gray-200">
      <div className="mx-auto h-0.5 w-28 bg-black" />
      <div className="max-w-7xl mx-auto px-4 py-4 text-sm md:text-base">
        <nav aria-label="Breadcrumb" className="text-gray-700">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <span key={`${crumb.to}-${crumb.label}`}>
                {isLast ? (
                  <span className="font-semibold text-gray-900">{crumb.label}</span>
                ) : (
                  <Link to={crumb.to} className="hover:text-black transition-colors">
                    {crumb.label}
                  </Link>
                )}
                {!isLast && <span className="mx-2 text-gray-400">›</span>}
              </span>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
