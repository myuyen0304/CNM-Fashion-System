export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  const variantClass =
    variant === "secondary"
      ? "bg-secondary hover:bg-yellow-600 text-white"
      : variant === "danger"
        ? "bg-danger hover:bg-red-600 text-white"
        : variant === "outline"
          ? "border border-primary text-primary hover:bg-blue-50"
          : "bg-primary hover:bg-blue-600 text-white";

  return (
    <button
      className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
