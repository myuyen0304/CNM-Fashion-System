import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(user);
  const [keyword, setKeyword] = useState("");

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

  return (
    <nav className="bg-primary text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-2xl font-bold">
          E-Shop
        </Link>

        {/* Search */}
        <div className="flex-1 mx-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full px-4 py-2 pr-12 rounded-lg text-black"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <button
              type="button"
              onClick={handleSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md text-gray-600 hover:text-primary hover:bg-blue-50 transition"
              aria-label="Tìm kiếm"
            >
              🔍
            </button>
          </div>
        </div>

        {/* User menu */}
        <div className="flex items-center gap-6">
          {/* Cart */}
          {isLoggedIn && (
            <Link to="/cart" className="relative" aria-label="Giỏ hàng">
              <span className="text-2xl">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {/* Auth */}
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link to="/orders" className="hover:opacity-80 transition">
                Đơn hàng
              </Link>
              <Link to="/chat" className="hover:opacity-80 transition">
                Chat
              </Link>
              <Link to="/profile" className="hover:opacity-80 transition">
                {user.name}
              </Link>
              <button
                onClick={handleLogout}
                className="bg-danger px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:opacity-80 transition">
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="bg-secondary px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
