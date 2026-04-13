import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ResetPasswordPage() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const successMessage = location.state?.message || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Email không đúng định dạng");
      return;
    }

    if (!OTP_REGEX.test(otp.trim())) {
      setError("OTP phải gồm đúng 6 chữ số");
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setError(
        "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosClient.post(`/auth/reset-password`, {
        email: normalizedEmail,
        otp: otp.trim(),
        password,
      });
      navigate("/login", {
        state: {
          message:
            response.data?.message ||
            "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.",
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi đặt lại mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 card p-8">
      <h1 className="text-2xl font-bold text-center mb-6">Đặt lại mật khẩu</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}
      {successMessage && (
        <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
          {successMessage}
        </div>
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
        <div>
          <label className="block text-sm font-medium mb-1">OTP</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            required
            className="input-field tracking-[0.4em]"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mật khẩu mới</label>
          <input
            type="password"
            required
            minLength="6"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Xác nhận mật khẩu
          </label>
          <input
            type="password"
            required
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
        </button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <p>
          <Link to="/forgot-password" className="text-primary hover:underline">
            Gửi lại OTP
          </Link>
        </p>
        <p>
          <Link to="/login" className="text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
