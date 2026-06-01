import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const STAFF_NAV_ITEMS = [
  {
    to: "/staff",
    label: "DASH BOARD",
    end: true,
    roles: ["admin", "supervisor", "employee"],
  },
  {
    to: "/admin/users",
    label: "Người dùng",
    roles: ["admin"],
  },
  {
    to: "/staff/products",
    label: "Sản Phẩm & Hàng Tồn Kho",
    roles: ["admin", "supervisor"],
  },
  {
    to: "/staff/orders",
    label: "Đơn Hàng",
    roles: ["admin", "supervisor", "employee"],
  },
  {
    to: "/staff/support",
    label: "Chat hỗ trợ",
    roles: ["admin", "supervisor", "employee"],
  },
];

export default function StaffLayout({ title, subtitle, children }) {
  const { user } = useAuth();
  const role = user?.role || "";
  const navItems = STAFF_NAV_ITEMS.filter((item) =>
    item.roles.includes(role),
  );

  const baseLinkClass =
    "block rounded-lg px-3 py-2 text-sm font-medium transition-colors";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <aside className="lg:col-span-3 xl:col-span-2">
        <div className="card p-4 lg:sticky lg:top-24">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `${baseLinkClass} ${
                    isActive ? "bg-primary text-white" : "hover:bg-gray-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      <section className="lg:col-span-9 xl:col-span-10">
        <div className="mb-5">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-gray-600">{subtitle}</p>}
        </div>
        {children}
      </section>
    </div>
  );
}
