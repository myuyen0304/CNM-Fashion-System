import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import LoadingSpinner from "../../components/LoadingSpinner";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const { token } = useParams();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(location.state?.message || "");
  const [resendCountdown, setResendCountdown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }

    const verify = async () => {
      try {
        const response = await axiosClient.get(`/auth/verify-email/${token}`);
        navigate("/login", {
          state: {
            message:
              response.data?.message ||
              "Xác minh email thành công! Bạn có thể đăng nhập.",
          },
        });
      } catch (err) {
        setError(err.response?.data?.message || "Xác minh email thất bại");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, navigate]);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  const handleVerifyOtp = async (e) => {
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

    setLoading(true);

    try {
      const response = await axiosClient.post("/auth/verify-registration-otp", {
        email: normalizedEmail,
        otp: otp.trim(),
      });
      navigate("/login", {
        state: {
          message:
            response.data?.message ||
            "Xác thực tài khoản thành công. Bạn có thể đăng nhập.",
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Xác thực email thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Email không đúng định dạng");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosClient.post("/auth/resend-registration-otp", {
        email: normalizedEmail,
      });
      setSuccess(
        response.data?.message || "OTP mới đã được gửi đến email của bạn.",
      );
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể gửi lại OTP");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-md mx-auto mt-12 card p-8">
      <h1 className="text-2xl font-bold text-center mb-6">Xác minh email</h1>
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
          {success}
        </div>
      )}

      {!token && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            Xác thực OTP
          </button>

          <button
            type="button"
            disabled={loading || resendCountdown > 0}
            onClick={handleResendOtp}
            className="btn-secondary w-full"
          >
            {resendCountdown > 0
              ? `Gửi lại OTP sau ${resendCountdown}s`
              : "Gửi lại OTP"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center">
        <Link to="/login" className="text-primary hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}
