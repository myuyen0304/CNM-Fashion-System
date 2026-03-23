export default function PriceTag({ value, className = "" }) {
  return (
    <span className={`font-bold text-primary ${className}`}>
      {Number(value || 0).toLocaleString("vi-VN")}₫
    </span>
  );
}
