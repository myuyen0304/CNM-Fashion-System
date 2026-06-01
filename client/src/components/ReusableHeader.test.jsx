import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReusableHeader from "./ReusableHeader";

const renderHeader = (props = {}) =>
  render(
    <MemoryRouter>
      <ReusableHeader
        logoSrc="/logo.png"
        searchValue=""
        menuItems={[]}
        {...props}
      />
    </MemoryRouter>,
  );

describe("ReusableHeader", () => {
  it("renders guest actions and cart link", () => {
    renderHeader({
      rightLinks: [
        { to: "/login", label: "ĐĂNG NHẬP" },
        { to: "/register", label: "ĐĂNG KÝ" },
      ],
      cartCount: 2,
    });

    expect(screen.getByRole("link", { name: "ĐĂNG NHẬP" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByRole("link", { name: "ĐĂNG KÝ" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.getByRole("link", { name: /GIỎ HÀNG/ })).toHaveAttribute(
      "href",
      "/cart",
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders account menu links and action items", () => {
    const handleLogout = vi.fn();

    renderHeader({
      cartFirst: true,
      cartCount: 3,
      userMenu: {
        displayName: "Lan Nguyen",
        avatarUrl: "",
        items: [
          { to: "/orders", label: "Đơn hàng của tôi" },
          { to: "/profile", label: "Thông tin cá nhân" },
          { label: "Đăng xuất", onClick: handleLogout },
        ],
      },
    });

    expect(screen.getByRole("button", { name: /Lan Nguyen/ })).toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Đơn hàng của tôi" })).toHaveAttribute(
      "href",
      "/orders",
    );
    expect(screen.getByRole("link", { name: "Thông tin cá nhân" })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(screen.getByRole("button", { name: "Đăng xuất" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
