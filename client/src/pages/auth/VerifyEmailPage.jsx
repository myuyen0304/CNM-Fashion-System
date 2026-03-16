import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      try {
        await axiosClient.get(`/auth/verify-email/${token}`);
        alert("Xác minh email thành công! Bạn có thể đăng nhập.");
        navigate("/login");
      } catch (err) {
        setError(err.response?.data?.message || "Xác minh email thất bại");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, navigate]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-md mx-auto mt-12 card p-8">
      <h1 className="text-2xl font-bold text-center mb-6">Xác minh email</h1>
      {error ? (
        <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>
      ) : (
        <div className="bg-green-100 text-green-700 p-3 rounded">
          Email đã được xác minh
        </div>
      )}
    </div>
  );
}
