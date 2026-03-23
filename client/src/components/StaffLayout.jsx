import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function StaffLayout({ title, subtitle, children }) {
  const { user } = useAuth();
  const role = user?.role || "";

  const canUsers = role === "admin";
  const canProducts = role === "admin" || role === "supervisor";
  const canOrders =
    role === "admin" || role === "supervisor" || role === "employee";
  const canSupport = canOrders;

  const baseLinkClass =
    "block rounded-lg px-3 py-2 text-sm font-medium transition-colors";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <aside className="lg:col-span-3 xl:col-span-2">
        <div className="card p-4 lg:sticky lg:top-24">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">
            Staff Navigation
          </div>
          <nav className="space-y-1">
            <NavLink
              to="/staff"
              end
              className={({ isActive }) =>
                `${baseLinkClass} ${
                  isActive ? "bg-primary text-white" : "hover:bg-gray-100"
                }`
              }
            >
              Dashboard
            </NavLink>
            {canUsers && (
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `${baseLinkClass} ${
                    isActive ? "bg-primary text-white" : "hover:bg-gray-100"
                  }`
                }
              >
                Users
              </NavLink>
            )}
            {canProducts && (
              <NavLink
                to="/staff/products"
                className={({ isActive }) =>
                  `${baseLinkClass} ${
                    isActive ? "bg-primary text-white" : "hover:bg-gray-100"
                  }`
                }
              >
                Products & Inventory
              </NavLink>
            )}
            {canOrders && (
              <NavLink
                to="/staff/orders"
                className={({ isActive }) =>
                  `${baseLinkClass} ${
                    isActive ? "bg-primary text-white" : "hover:bg-gray-100"
                  }`
                }
              >
                Orders
              </NavLink>
            )}
            {canSupport && (
              <NavLink
                to="/staff/support"
                className={({ isActive }) =>
                  `${baseLinkClass} ${
                    isActive ? "bg-primary text-white" : "hover:bg-gray-100"
                  }`
                }
              >
                Support Chat
              </NavLink>
            )}
          </nav>
        </div>
      </aside>

      <section className="lg:col-span-9 xl:col-span-10">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {children}
      </section>
    </div>
  );
}
