import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import StaffLayout from "../../components/StaffLayout";

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const role = user?.role || "";

  const canManageUsers = role === "admin";
  const canManageProducts = role === "admin" || role === "supervisor";
  const canManageOrders =
    role === "admin" || role === "supervisor" || role === "employee";
  const canSupport = canManageOrders;

  return (
    <StaffLayout
      title="Bảng Điều Khiển Nhân Viên"
      subtitle={`Vai trò hiện tại: ${role}`}
    >

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {canManageUsers && (
          <Link to="/admin/users" className="card p-5 hover:shadow-lg transition">
            <div className="text-sm text-gray-500 mb-1">Quản Trị Viên</div>
            <div className="text-lg font-semibold">Quản Lý Người Dùng & Vai Trò</div>
            <div className="text-sm text-gray-600 mt-2">
              Đặt vai trò và trạng thái hoạt động cho tài khoản.
            </div>
          </Link>
        )}

        {canManageProducts && (
          <Link
            to="/staff/products"
            className="card p-5 hover:shadow-lg transition"
          >
            <div className="text-sm text-gray-500 mb-1">Giám Sát Viên</div>
            <div className="text-lg font-semibold">Sản Phẩm & Hàng Tồn Kho</div>
            <div className="text-sm text-gray-600 mt-2">
              Cập nhật tồn kho, đổi tên/xóa danh mục.
            </div>
          </Link>
        )}

        {canManageOrders && (
          <Link to="/staff/orders" className="card p-5 hover:shadow-lg transition">
            <div className="text-sm text-gray-500 mb-1">Nhân Viên</div>
            <div className="text-lg font-semibold">Đơn Hàng & Doanh Thu</div>
            <div className="text-sm text-gray-600 mt-2">
              Xem đơn hàng, cập nhật trạng thái, xử lý hoàn lại.
            </div>
          </Link>
        )}

        {canSupport && (
          <Link to="/staff/support" className="card p-5 hover:shadow-lg transition">
            <div className="text-sm text-gray-500 mb-1">Nhân Viên</div>
            <div className="text-lg font-semibold">Chat Hỗ Trợ Khách Hàng</div>
            <div className="text-sm text-gray-600 mt-2">
              Tiếp nhận phòng hỗ trợ và trả lời khách hàng.
            </div>
          </Link>
        )}
      </div>
    </StaffLayout>
  );
}
