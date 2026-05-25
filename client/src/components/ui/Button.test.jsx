import { render, screen } from "@testing-library/react";
import Button from "./Button";

describe("Button", () => {
  it("renders children and forwards button props", () => {
    render(<Button type="submit">Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "submit");
  });
});
