import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message || "";
  const nextPath = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Loi dang nhap");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 card p-8">
      <h1 className="text-2xl font-bold text-center mb-6">Dang nhap</h1>

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
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mat khau</label>
          <input
            type="password"
            required
            className="input-field"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Dang dang nhap..." : "Dang nhap"}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center">
        <p>
          <Link to="/forgot-password" className="text-primary hover:underline">
            Quen mat khau?
          </Link>
        </p>
        {error.toLowerCase().includes("chua duoc xac thuc") && (
          <p>
            <button
              type="button"
              onClick={() =>
                navigate("/verify-email", {
                  state: { email: formData.email.trim().toLowerCase() },
                })
              }
              className="text-primary hover:underline"
            >
              Nhap OTP xac thuc tai khoan
            </button>
          </p>
        )}
        <p>
          Chua co tai khoan?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Dang ky ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
