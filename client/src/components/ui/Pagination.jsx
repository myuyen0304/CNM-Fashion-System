import Button from "./Button";

export default function Pagination({ page, totalPages, onPrev, onNext }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <Button variant="secondary" disabled={page <= 1} onClick={onPrev}>
        Trang trước
      </Button>
      <span className="px-3 py-2 text-sm text-gray-700">
        Trang {page} / {totalPages}
      </span>
      <Button variant="secondary" disabled={page >= totalPages} onClick={onNext}>
        Trang sau
      </Button>
    </div>
  );
}
