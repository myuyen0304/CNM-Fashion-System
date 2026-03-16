import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";

const SHIPPING_OPTIONS = [
  { id: "standard", name: "Giao hàng tiêu chuẩn (2-3 ngày)", fee: 20000 },
  { id: "express", name: "Giao hàng nhanh (1 ngày)", fee: 50000 },
];

const PAYMENT_METHODS = [
  { id: "vnpay", name: "VNPay" },
  // { id: "momo", name: "Momo" },
];

const formatMoney = (value = 0) =>
  `${Number(value || 0).toLocaleString("vi-VN")}₫`;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, cartTotal, cartCount, clearCart, fetchCart } = useCart();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    phone: "",
    address: "",
    city: "",
    shippingMethod: "standard",
    paymentMethod: "vnpay",
    note: "",
  });

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep = () => {
    setError("");
    if (step === 1) {
      if (
        !formData.fullName ||
        !formData.phone ||
        !formData.address ||
        !formData.city
      ) {
        setError("Vui lòng điền đầy đủ thông tin giao hàng");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const shippingFee =
    SHIPPING_OPTIONS.find((opt) => opt.id === formData.shippingMethod)?.fee ||
    0;
  const total = cartTotal + shippingFee;

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");

      // Đồng bộ cart từ server ngay trước khi tạo order.
      const cartRes = await axiosClient.get("/cart");
      const serverItems = cartRes.data?.data?.items || [];
      if (serverItems.length === 0) {
        setError("Giỏ hàng bị trống.");
        return;
      }

      // Create order
      const orderRes = await axiosClient.post("/orders", {
        items,
        shippingAddress: {
          fullName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
        },
        shippingPhone: formData.phone,
        shippingMethod: formData.shippingMethod,
        paymentMethod: formData.paymentMethod,
        note: formData.note,
      });

      const orderId = orderRes.data.data._id;

      // Initiate payment
      if (formData.paymentMethod === "vnpay") {
        const paymentRes = await axiosClient.post("/payments/initiate", {
          orderId,
          amount: total,
          method: "vnpay",
        });
        window.location.href = paymentRes.data.data.paymentUrl;
      } else {
        // MoMo mocked - just show success
        alert("Thanh toán mock thành công!");
        await clearCart();
        navigate(`/order-detail/${orderId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi thanh toán");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-0">
      <h1 className="text-3xl font-bold mb-2">Thanh toán</h1>
      <p className="text-gray-600 mb-8">
        Hoàn tất thông tin để đặt đơn nhanh chóng.
      </p>

      {/* Steps indicator */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div
          className={`rounded-xl border p-4 text-center ${step >= 1 ? "border-primary bg-blue-50" : "border-gray-200"}`}
        >
          <div
            className={`font-semibold ${step >= 1 ? "text-primary" : "text-gray-500"}`}
          >
            1. Địa chỉ giao hàng
          </div>
        </div>
        <div
          className={`rounded-xl border p-4 text-center ${step >= 2 ? "border-primary bg-blue-50" : "border-gray-200"}`}
        >
          <div
            className={`font-semibold ${step >= 2 ? "text-primary" : "text-gray-500"}`}
          >
            2. Phương thức giao hàng
          </div>
        </div>
        <div
          className={`rounded-xl border p-4 text-center ${step >= 3 ? "border-primary bg-blue-50" : "border-gray-200"}`}
        >
          <div
            className={`font-semibold ${step >= 3 ? "text-primary" : "text-gray-500"}`}
          >
            3. Thanh toán
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded mb-6">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Form */}
        <div className="lg:col-span-2 card p-5 sm:p-6">
          {/* Step 1: Address */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Địa chỉ giao hàng</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="fullName"
                  placeholder="Họ tên"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="input-field sm:col-span-2"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Số điện thoại"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="input-field"
                />
                <input
                  type="text"
                  name="city"
                  placeholder="Thành phố"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="input-field"
                />
                <input
                  type="text"
                  name="address"
                  placeholder="Địa chỉ cụ thể"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="input-field sm:col-span-2"
                />
              </div>
            </div>
          )}

          {/* Step 2: Shipping */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Phương thức giao hàng</h2>
              <div className="space-y-3">
                {SHIPPING_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={`block border rounded-xl p-4 cursor-pointer transition ${
                      formData.shippingMethod === option.id
                        ? "border-primary bg-blue-50"
                        : "border-gray-200 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="shippingMethod"
                          value={option.id}
                          checked={formData.shippingMethod === option.id}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                        <span className="font-semibold leading-6">
                          {option.name}
                        </span>
                      </div>
                      <span className="text-primary font-bold whitespace-nowrap">
                        {formatMoney(option.fee)}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Phương thức thanh toán</h2>
              <div className="space-y-3 mb-6">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={`block border rounded-xl p-4 cursor-pointer transition ${
                      formData.paymentMethod === method.id
                        ? "border-primary bg-blue-50"
                        : "border-gray-200 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={formData.paymentMethod === method.id}
                        onChange={handleInputChange}
                      />
                      <span className="font-semibold">{method.name}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block font-semibold mb-2">
                  Ghi chú đơn hàng
                </label>
                <textarea
                  name="note"
                  rows="3"
                  placeholder="Ghi chú thêm..."
                  value={formData.note}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="card p-5 sm:p-6 h-fit lg:sticky lg:top-24">
          <h3 className="text-xl font-bold mb-1">Tóm tắt đơn hàng</h3>
          <p className="text-sm text-gray-500 mb-4">{cartCount} sản phẩm</p>

          {items.length > 0 && (
            <div className="border border-gray-100 rounded-lg p-3 mb-4 bg-gray-50/60">
              <div className="text-sm text-gray-500 mb-2">Sản phẩm đã chọn</div>
              <div className="space-y-2 max-h-44 overflow-auto pr-1">
                {items.slice(0, 4).map((item, idx) => (
                  <div
                    key={item._id || `${item.productId}-${idx}`}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="line-clamp-1">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-semibold whitespace-nowrap">
                      {formatMoney(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
                {items.length > 4 && (
                  <div className="text-xs text-gray-500">
                    +{items.length - 4} sản phẩm khác
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 border-b pb-4 mb-4">
            <div className="flex justify-between">
              <span>Tổng tiền hàng</span>
              <span className="font-semibold">{formatMoney(cartTotal)}</span>
            </div>
            {step >= 2 && (
              <div className="flex justify-between">
                <span>Phí vận chuyển</span>
                <span className="font-semibold">
                  {formatMoney(shippingFee)}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between text-lg font-bold mb-6">
            <span>Tổng cộng</span>
            <span className="text-primary">{formatMoney(total)}</span>
          </div>

          <div className="space-y-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="w-full btn-secondary py-2"
              >
                Quay lại
              </button>
            )}
            {step < 3 ? (
              <button onClick={handleNext} className="w-full btn-primary py-2">
                Tiếp tục
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full btn-primary py-2 disabled:opacity-50"
              >
                {loading ? "Đang xử lý..." : "Thanh toán"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
