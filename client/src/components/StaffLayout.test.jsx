import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffLayout from "./StaffLayout";

let mockUser = { role: "admin" };

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const renderStaffLayout = (role) => {
  mockUser = { role };

  return render(
    <MemoryRouter>
      <StaffLayout title="Test title">
        <div>Content</div>
      </StaffLayout>
    </MemoryRouter>,
  );
};

describe("StaffLayout", () => {
  it("shows exactly the five allowed admin menu items", () => {
    renderStaffLayout("admin");

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);
    expect(links.map((link) => link.textContent)).toEqual([
      "DASH BOARD",
      "Người dùng",
      "Sản Phẩm & Hàng Tồn Kho",
      "Đơn Hàng",
      "Chat hỗ trợ",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/staff",
      "/admin/users",
      "/staff/products",
      "/staff/orders",
      "/staff/support",
    ]);
  });

  it("keeps supervisor menu access without user management", () => {
    renderStaffLayout("supervisor");

    expect(screen.queryByRole("link", { name: "Người dùng" })).toBeNull();
    expect(screen.getByRole("link", { name: "DASH BOARD" })).toHaveAttribute(
      "href",
      "/staff",
    );
    expect(
      screen.getByRole("link", { name: "Sản Phẩm & Hàng Tồn Kho" }),
    ).toHaveAttribute("href", "/staff/products");
    expect(screen.getByRole("link", { name: "Đơn Hàng" })).toHaveAttribute(
      "href",
      "/staff/orders",
    );
    expect(screen.getByRole("link", { name: "Chat hỗ trợ" })).toHaveAttribute(
      "href",
      "/staff/support",
    );
  });

  it("keeps employee menu access limited to dashboard orders and support", () => {
    renderStaffLayout("employee");

    expect(screen.queryByRole("link", { name: "Người dùng" })).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Sản Phẩm & Hàng Tồn Kho" }),
    ).toBeNull();
    expect(screen.getByRole("link", { name: "DASH BOARD" })).toHaveAttribute(
      "href",
      "/staff",
    );
    expect(screen.getByRole("link", { name: "Đơn Hàng" })).toHaveAttribute(
      "href",
      "/staff/orders",
    );
    expect(screen.getByRole("link", { name: "Chat hỗ trợ" })).toHaveAttribute(
      "href",
      "/staff/support",
    );
  });
});
