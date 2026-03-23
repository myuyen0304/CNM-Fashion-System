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
      title="Staff Dashboard"
      subtitle={`Role hiện tại: ${role}`}
    >

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {canManageUsers && (
          <Link to="/admin/users" className="card p-5 hover:shadow-lg transition">
            <div className="text-sm text-gray-500 mb-1">Admin</div>
            <div className="text-lg font-semibold">User & Role Management</div>
            <div className="text-sm text-gray-600 mt-2">
              Set role and active status for accounts.
            </div>
          </Link>
        )}

        {canManageProducts && (
          <Link
            to="/staff/products"
            className="card p-5 hover:shadow-lg transition"
          >
            <div className="text-sm text-gray-500 mb-1">Supervisor</div>
            <div className="text-lg font-semibold">Products & Inventory</div>
            <div className="text-sm text-gray-600 mt-2">
              Update stock, rename/delete categories.
            </div>
          </Link>
        )}

        {canManageOrders && (
          <Link to="/staff/orders" className="card p-5 hover:shadow-lg transition">
            <div className="text-sm text-gray-500 mb-1">Staff</div>
            <div className="text-lg font-semibold">Orders & Revenue</div>
            <div className="text-sm text-gray-600 mt-2">
              View orders, update status, handle returns.
            </div>
          </Link>
        )}

        {canSupport && (
          <Link to="/staff/support" className="card p-5 hover:shadow-lg transition">
            <div className="text-sm text-gray-500 mb-1">Employee</div>
            <div className="text-lg font-semibold">Customer Support Chat</div>
            <div className="text-sm text-gray-600 mt-2">
              Take support rooms and reply to customers.
            </div>
          </Link>
        )}
      </div>
    </StaffLayout>
  );
}
