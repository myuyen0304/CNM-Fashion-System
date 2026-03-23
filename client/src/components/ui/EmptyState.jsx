export default function EmptyState({ title, description = "" }) {
  return (
    <div className="text-center py-12">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {description && <p className="text-gray-500">{description}</p>}
    </div>
  );
}
