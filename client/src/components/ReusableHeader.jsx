import { Link } from "react-router-dom";

export default function ReusableHeader({
  logoSrc,
  hotline = "070 347 0938",
  onSearch,
  searchValue,
  onSearchChange,
  onSearchEnter,
  menuItems = [],
  rightLinks = [],
  cartCount = 0,
  cartTo = "/cart",
  showCart = true,
}) {
  return (
    <header className="bg-white text-black border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col gap-2 py-2">
          <div className="flex items-center gap-4">
            <Link to="/" className="shrink-0">
              <img
                src={logoSrc}
                alt="Logo"
                className="h-16 w-auto object-contain"
              />
            </Link>

            <div className="hidden lg:flex items-center gap-6 text-sm text-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full border border-black grid place-items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 4.5a1.5 1.5 0 011.5-1.5h3.3a1.5 1.5 0 011.44 1.08l.75 2.55a1.5 1.5 0 01-.45 1.53l-1.5 1.2a12 12 0 005.76 5.76l1.2-1.5a1.5 1.5 0 011.53-.45l2.55.75a1.5 1.5 0 011.08 1.44v3.3a1.5 1.5 0 01-1.5 1.5h-.75c-9.113 0-16.5-7.387-16.5-16.5V4.5z"
                    />
                  </svg>
                </span>
                <span>
                  HOTLINE: <strong>{hotline}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full border border-black grid place-items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 21s7-4.35 7-10a7 7 0 10-14 0c0 5.65 7 10 7 10z"
                    />
                    <circle cx="12" cy="11" r="2.5" />
                  </svg>
                </span>
                <span>HỆ THỐNG CỬA HÀNG</span>
              </div>
            </div>

            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <input
                  type="text"
                  value={searchValue}
                  onChange={onSearchChange}
                  onKeyDown={onSearchEnter}
                  placeholder="Tìm sản phẩm..."
                  className="w-full rounded-md border border-gray-300 bg-gray-100 px-4 py-2 pr-10 text-sm focus:outline-none focus:border-gray-500"
                />
                <button
                  onClick={onSearch}
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-lg"
                  aria-label="search"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-5">
              {rightLinks.map((item) =>
                item.to ? (
                  <Link
                    key={`${item.to}-${item.label}`}
                    to={item.to}
                    className="text-xs font-semibold uppercase tracking-wide hover:text-primary transition"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className="text-xs font-semibold uppercase tracking-wide hover:text-primary transition"
                  >
                    {item.label}
                  </button>
                ),
              )}
              {showCart && (
                <Link
                  to={cartTo}
                  className="relative text-xs font-semibold uppercase tracking-wide hover:text-primary transition"
                >
                  GIỎ HÀNG
                  <span className="absolute -top-2 -right-3 w-5 h-5 rounded-full bg-black text-white text-[10px] grid place-items-center">
                    {cartCount}
                  </span>
                </Link>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center gap-8 text-[22px] py-1">
            {menuItems.map((item) => (
              <div key={`${item.label}-${item.to}`} className="relative group">
                <Link
                  to={item.to}
                  className={`text-sm uppercase font-medium hover:text-primary transition ${
                    item.highlight ? "text-orange-500" : "text-gray-800"
                  }`}
                >
                  {item.label}
                </Link>

                {Array.isArray(item.dropdownItems) &&
                  item.dropdownItems.length > 0 && (
                    <div className="absolute left-1/2 top-full z-50 hidden w-64 -translate-x-1/2 pt-2 group-hover:block">
                      <div className="rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                        <div className="max-h-80 overflow-y-auto">
                          {item.dropdownItems.map((subItem) => (
                            <Link
                              key={`${item.label}-${subItem.to}`}
                              to={subItem.to}
                              className="block rounded px-3 py-2 text-sm normal-case text-gray-700 hover:bg-gray-100 hover:text-primary"
                            >
                              {subItem.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
