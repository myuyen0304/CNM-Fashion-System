import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import LoadingSpinner from "../../components/LoadingSpinner";
import StaffLayout from "../../components/StaffLayout";

const ROLE_OPTIONS = ["customer", "employee", "supervisor", "admin"];

export default function UsersManagementPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const fetchUsers = async (targetPage = page) => {
    try {
      setLoading(true);
      const res = await axiosClient.get("/users", {
        params: {
          page: targetPage,
          limit: 20,
          keyword: keyword || undefined,
          role: roleFilter || undefined,
          isActive: activeFilter || undefined,
        },
      });
      const data = res.data?.data || {};
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, activeFilter]);

  const changeRole = async (userId, role) => {
    if (!window.confirm(`Thay đổi vai trò người dùng thành "${role}"?`)) return;
    try {
      await axiosClient.patch(`/users/${userId}/role`, { role });
      fetchUsers(page);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể cập nhật vai trò");
    }
  };

  const toggleActive = async (userId, isActive) => {
    if (!window.confirm(`${isActive ? "Kích hoạt" : "Vô hiệu hóa"} tài khoản này?`))
      return;
    try {
      await axiosClient.patch(`/users/${userId}/active-status`, { isActive });
      fetchUsers(page);
    } catch (err) {
      alert(err.response?.data?.message || "Không thể cập nhật trạng thái");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <StaffLayout
      title="Quản Lý Người Dùng - Admin"
      subtitle="Phân quyền và khóa/mở khóa tài khoản người dùng"
    >
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="input-field"
            placeholder="Tìm kiếm tên/email"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                fetchUsers(1);
              }
            }}
          />
          <select
            className="input-field"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả vai trò</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select
            className="input-field"
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">hoạt động</option>
            <option value="false">không hoạt động</option>
          </select>
          <div className="flex gap-2">
            <button
              className="btn-primary flex-1"
              onClick={() => {
                setPage(1);
                fetchUsers(1);
              }}
            >
              Áp Dụng
            </button>
            <button
              className="btn-secondary flex-1"
              onClick={() => {
                setKeyword("");
                setRoleFilter("");
                setActiveFilter("");
                setPage(1);
              }}
            >
              Xóa
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Tên</th>
              <th className="text-left py-3 px-4">Email</th>
              <th className="text-left py-3 px-4">Vai Trò</th>
              <th className="text-left py-3 px-4">Trạng Thái</th>
              <th className="text-left py-3 px-4">Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-b">
                <td className="py-3 px-4">{user.name}</td>
                <td className="py-3 px-4">{user.email}</td>
                <td className="py-3 px-4">
                  <select
                    className="border rounded px-2 py-1"
                    value={user.role}
                    onChange={(e) => changeRole(user._id, e.target.value)}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={
                      user.isActive === false ? "text-red-600" : "text-green-600"
                    }
                  >
                    {user.isActive === false ? "không hoạt động" : "hoạt động"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => toggleActive(user._id, !(user.isActive !== false))}
                    className="btn-secondary text-sm"
                  >
                    {user.isActive === false ? "Kích Hoạt" : "Vô Hiệu Hóa"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            className="btn-secondary px-4 py-2 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Trước
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            className="btn-secondary px-4 py-2 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Tiếp Theo
          </button>
        </div>
      )}
    </StaffLayout>
  );
}
