import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import PriceTag from "./ui/PriceTag";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { token } = useAuth();
  const [adding, setAdding] = useState(false);
  const isLoggedIn = Boolean(token);

  const availableSizes = Array.isArray(product.sizes)
    ? product.sizes
    : typeof product.size === "string"
      ? product.size
          .split("|")
          .map((size) => size.trim().toUpperCase())
          .filter(Boolean)
      : [];

  const handleAddToCart = async (e) => {
    e.preventDefault();
    try {
      setAdding(true);
      await addItem(product._id, 1, availableSizes[0] || "");
      alert("Đã thêm vào giỏ hàng");
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi thêm vào giỏ");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link to={`/products/${product._id}`}>
      <Card className="overflow-hidden">
        <div className="relative pb-[100%] bg-gray-200">
          <img
            src={product.images?.[0] || "/placeholder.jpg"}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover hover:scale-110 transition-transform"
          />
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-lg truncate">{product.name}</h3>

          {availableSizes.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-gray-500">Size</span>
              {availableSizes.slice(0, 3).map((size) => (
                <span
                  key={size}
                  className="px-2 py-1 text-xs font-semibold rounded border border-gray-300 bg-white"
                >
                  {size}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-yellow-500">★ {product.avgRating}</span>
            <span className="text-gray-500 text-sm">Bán {product.soldCount}</span>
          </div>

          <div className="flex items-center justify-between mt-4">
            <PriceTag value={product.price} className="text-2xl" />
            {isLoggedIn ? (
              <Button
                onClick={handleAddToCart}
                disabled={adding}
                variant="secondary"
                className="text-sm"
              >
                {adding ? "..." : "Thêm"}
              </Button>
            ) : (
              <span className="text-sm font-medium text-primary">Xem chi tiết</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
