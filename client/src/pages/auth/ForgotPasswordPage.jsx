import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await axiosClient.post("/auth/forgot-password", {
        email: normalizedEmail,
      });
      navigate("/reset-password", {
        state: {
          email: normalizedEmail,
          message:
            response.data?.message ||
            "Nếu email tồn tại trong hệ thống, OTP đặt lại mật khẩu đã được gửi.",
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi gửi email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 card p-8">
      <h1 className="text-2xl font-bold text-center mb-6">Quên mật khẩu</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Đang gửi..." : "Gửi OTP reset"}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link to="/login" className="text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}
