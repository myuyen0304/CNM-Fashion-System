import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";

export default function CartPage() {
  const { items, cartTotal, updateItem, removeItem, cartCount, fetchCart } =
    useCart();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        await fetchCart();
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleQuantityChange = async (itemId, newQty) => {
    if (newQty === 0) {
      await removeItem(itemId);
    } else {
      await updateItem(itemId, newQty);
    }
  };

  if (loading) return <div className="text-center py-12">Đang tải...</div>;

  if (cartCount === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Giỏ hàng trống</h2>
        <Link to="/" className="btn-primary">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Items table */}
      <div className="lg:col-span-2">
        <h1 className="text-3xl font-bold mb-6">Giỏ hàng ({cartCount})</h1>
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="text-left py-3 px-4">Sản phẩm</th>
                <th className="text-right py-3 px-4">Giá</th>
                <th className="text-center py-3 px-4">Số lượng</th>
                <th className="text-right py-3 px-4">Thành tiền</th>
                <th className="text-center py-3 px-4">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      {item.size && (
                        <div className="text-sm text-gray-600">
                          Size: {item.size}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        ID: {item.productId}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {item.unitPrice.toLocaleString("vi-VN")}₫
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() =>
                          handleQuantityChange(item._id, item.quantity - 1)
                        }
                        className="px-2 py-1 border border-gray-300 rounded"
                      >
                        -
                      </button>
                      <span className="px-4 py-1">{item.quantity}</span>
                      <button
                        onClick={() =>
                          handleQuantityChange(item._id, item.quantity + 1)
                        }
                        className="px-2 py-1 border border-gray-300 rounded"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-semibold">
                    {(item.unitPrice * item.quantity).toLocaleString("vi-VN")}₫
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => removeItem(item._id)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary card */}
      <div className="lg:col-span-1">
        <div className="card p-6 h-fit">
          <h3 className="text-xl font-bold mb-4">Tóm tắt đơn hàng</h3>

          <div className="space-y-3 border-b pb-4 mb-4">
            <div className="flex justify-between">
              <span>Tổng tiền hàng</span>
              <span className="font-semibold">
                {cartTotal.toLocaleString("vi-VN")}₫
              </span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Phí vận chuyển</span>
              <span>Tính ở bước tiếp theo</span>
            </div>
          </div>

          <div className="flex justify-between text-lg font-bold mb-6">
            <span>Tổng cộng</span>
            <span className="text-primary">
              {cartTotal.toLocaleString("vi-VN")}₫
            </span>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className="btn-primary w-full py-3 text-lg"
          >
            Thanh toán
          </button>

          <Link
            to="/"
            className="block mt-3 text-center text-gray-600 hover:text-primary"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    </div>
  );
}
