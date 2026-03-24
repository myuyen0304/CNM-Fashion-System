export default function SectionHeading({ title, subtitle = "", className = "" }) {
  return (
    <div className={className}>
      <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
      {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}
