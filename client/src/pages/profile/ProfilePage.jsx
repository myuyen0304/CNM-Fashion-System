import { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../contexts/AuthContext";

export default function ProfilePage() {
  const { user, syncUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("info");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Info form
  const [infoData, setInfoData] = useState({
    name: "",
    avatar: null,
    avatarPreview: "",
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      setInfoData({
        name: user.name,
        avatar: null,
        avatarPreview: user.avatarUrl || user.avatar || "",
      });
    }
  }, [user]);

  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setInfoData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInfoData((prev) => ({
        ...prev,
        avatar: file,
        avatarPreview: URL.createObjectURL(file),
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateInfo = async () => {
    setError("");
    setSuccess("");

    try {
      setLoading(true);
      let latestUser = null;

      // Cập nhật tên
      const profileRes = await axiosClient.put("/users/profile", {
        name: infoData.name,
      });
      latestUser = profileRes.data?.data || latestUser;

      // Cập nhật avatar nếu có chọn file
      if (infoData.avatar) {
        const formData = new FormData();
        formData.append("avatar", infoData.avatar);
        const avatarRes = await axiosClient.put("/users/avatar", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        latestUser = avatarRes.data?.data || latestUser;

        if (latestUser?.avatarUrl) {
          setInfoData((prev) => ({
            ...prev,
            avatar: null,
            avatarPreview: latestUser.avatarUrl,
          }));
        }
      }

      if (latestUser) {
        syncUser(latestUser);
      }

      setSuccess("Cập nhật thông tin thành công!");
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setError("");
    setSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Mật khẩu mới không trùng khớp");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    try {
      setLoading(true);
      await axiosClient.put("/users/change-password", {
        currentPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });

      setSuccess("Đổi mật khẩu thành công!");
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi đổi mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div>Vui lòng đăng nhập</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Thông tin cá nhân</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b">
        <button
          onClick={() => setTab("info")}
          className={`pb-4 font-semibold ${tab === "info" ? "border-b-2 border-primary text-primary" : "text-gray-500"}`}
        >
          Thông tin
        </button>
        <button
          onClick={() => setTab("password")}
          className={`pb-4 font-semibold ${tab === "password" ? "border-b-2 border-primary text-primary" : "text-gray-500"}`}
        >
          Đổi mật khẩu
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded mb-6">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded mb-6">
          {success}
        </div>
      )}

      {/* Info Tab */}
      {tab === "info" && (
        <div className="card p-6">
          <div className="mb-6">
            <label className="block mb-2">
              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-gray-100">
                <img
                  src={infoData.avatarPreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="block mx-auto text-sm"
            />
            <div className="text-center text-sm text-gray-500 mt-2">
              JPG, PNG, WebP. Max 5MB
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Họ tên</label>
            <input
              type="text"
              name="name"
              value={infoData.name}
              onChange={handleInfoChange}
              className="input-field"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="input-field opacity-50"
            />
          </div>

          <button
            onClick={handleUpdateInfo}
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Đang cập nhật..." : "Cập nhật thông tin"}
          </button>
        </div>
      )}

      {/* Password Tab */}
      {tab === "password" && (
        <div className="card p-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Mật khẩu cũ
            </label>
            <input
              type="password"
              name="oldPassword"
              value={passwordData.oldPassword}
              onChange={handlePasswordChange}
              placeholder="Nhập mật khẩu cũ"
              className="input-field"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Mật khẩu mới
            </label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              placeholder="Nhập mật khẩu mới"
              className="input-field"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Xác nhận mật khẩu"
              className="input-field"
            />
          </div>

          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
          </button>
        </div>
      )}

    </div>
  );
}
