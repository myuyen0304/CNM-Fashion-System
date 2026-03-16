import { useState } from "react";

export default function StarRating({ value, onChange, readonly = false }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => !readonly && onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`text-3xl transition-transform hover:scale-110 ${
            star <= (hover || value) ? "text-yellow-400" : "text-gray-300"
          }`}
          disabled={readonly}
        >
          ★
        </button>
      ))}
    </div>
  );
}
