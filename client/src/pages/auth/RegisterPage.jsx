import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const COMMON_DOMAIN_TYPOS = {
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmai.com": "gmail.com",
  "gmial.com": "gmail.com",
  "yahooo.com": "yahoo.com",
  "hotnail.com": "hotmail.com",
};

const getTypoSuggestion = (email) => {
  const domain = email.split("@")[1] || "";
  return COMMON_DOMAIN_TYPOS[domain] || "";
};

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    const normalizedEmail = formData.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Email không đúng định dạng");
      return;
    }

    const typoSuggestion = getTypoSuggestion(normalizedEmail);
    if (typoSuggestion) {
      setError(`Email có thể bị sai, bạn có muốn dùng ${typoSuggestion}?`);
      return;
    }

    if (!PASSWORD_REGEX.test(formData.password)) {
      setError(
        "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số",
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }

    setLoading(true);

    try {
      await axiosClient.post("/auth/register", {
        name: formData.name.trim(),
        email: normalizedEmail,
        password: formData.password,
      });
      alert("Đăng ký thành công!");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi đăng ký");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 card p-8">
      <h1 className="text-2xl font-bold text-center mb-6">Đăng ký</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Họ tên</label>
          <input
            type="text"
            required
            className="input-field"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required
            className="input-field"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mật khẩu</label>
          <input
            type="password"
            required
            minLength="6"
            className="input-field"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
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
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Đang đăng ký..." : "Đăng ký"}
        </button>
      </form>

      <p className="mt-6 text-center">
        Đã có tài khoản?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  );
}
