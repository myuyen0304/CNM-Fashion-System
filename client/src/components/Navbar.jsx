import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import ReusableHeader from "./ReusableHeader";
import logoImage from "../assets/images/logo.png";

const BASE_MENU_ITEMS = [
  { label: "TRANG CHỦ", to: "/Home" },
  { label: "DANH MỤC", to: "/Danh-muc" },
  { label: "BỘ SƯU TẬP", to: "/bo-suu-tap" },
  { label: "TIN TỨC THỜI TRANG", to: "/tin-tuc-thoi-trang" },
  { label: "TRỢ GIÚP", to: "/tro-giup" },
  { label: "KHUYẾN MÃI", to: "/Khuyen-mai", highlight: true },
];
const HELP_MENU_ITEMS = [
  { label: "Về Chúng Tôi", to: "/ve-chung-toi" },
  { label: "Chăm Sóc Khách Hàng", to: "/cham-soc-khach-hang" },
  { label: "Tuyển Dụng & Việc Làm", to: "/tuyen-dung-viec-lam" },
  { label: "Chính Sách", to: "/chinh-sach" },
];
const RESERVED_MENU_LABELS = new Set(
  BASE_MENU_ITEMS.map((item) => item.label.toLowerCase()),
);

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(user);
  const role = user?.role;
  const isCustomer = role === "customer";
  const isAdmin = role === "admin";
  const isStaff =
    role === "admin" || role === "supervisor" || role === "employee";
  const [keyword, setKeyword] = useState("");
  const [categoryItems, setCategoryItems] = useState([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await axiosClient.get("/products/categories");
        const categories = Array.isArray(res.data?.data) ? res.data.data : [];
        const seen = new Set();
        const cleanedCategories = categories
          .map((category) => String(category || "").trim())
          .filter(Boolean)
          .filter((category) => !RESERVED_MENU_LABELS.has(category.toLowerCase()))
          .filter((category) => {
            const key = category.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

        setCategoryItems(
          cleanedCategories.map((category) => ({
            label: category,
            to: `/shop?categories=${encodeURIComponent(category)}`,
          })),
        );
      } catch (err) {
        console.error("Load categories error:", err);
        setCategoryItems([]);
      }
    };

    loadCategories();
  }, []);

  const storeMenuItems = useMemo(
    () =>
      BASE_MENU_ITEMS.map((item) =>
        item.label === "DANH MỤC"
          ? { ...item, dropdownItems: categoryItems }
          : item.label === "TRỢ GIÚP"
            ? { ...item, dropdownItems: HELP_MENU_ITEMS }
          : item,
      ),
    [categoryItems],
  );

  const handleSearch = () => {
    const query = keyword.trim();
    if (!query) {
      navigate("/search");
      return;
    }

    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (isAdmin) {
    return (
      <nav className="bg-primary text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/staff" className="text-2xl font-bold whitespace-nowrap">
            Bảng Điều Khiển Quản Trị
          </Link>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <Link
              to="/staff"
              className="hover:opacity-80 transition font-semibold"
            >
              Khu Quản Trị
            </Link>
            <button
              onClick={handleLogout}
              className="bg-danger px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <ReusableHeader
      logoSrc={logoImage}
      hotline="070 347 0938"
      searchValue={keyword}
      onSearchChange={(e) => setKeyword(e.target.value)}
      onSearchEnter={(e) => e.key === "Enter" && handleSearch()}
      onSearch={handleSearch}
      menuItems={storeMenuItems}
      rightLinks={
        isLoggedIn
          ? [
              ...(isCustomer ? [{ to: "/orders", label: "TÀI KHOẢN" }] : []),
              ...(isStaff ? [{ to: "/staff", label: "KHU QUẢN TRỊ" }] : []),
              { to: "/profile", label: user?.name || "TÀI KHOẢN" },
              { label: "ĐĂNG XUẤT", onClick: handleLogout },
            ]
          : [
              { to: "/login", label: "ĐĂNG NHẬP" },
              { to: "/register", label: "ĐĂNG KÝ" },
            ]
      }
      cartCount={isCustomer ? cartCount : 0}
    />
  );
}
