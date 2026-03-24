export default function Card({ className = "", children }) {
  return (
    <div className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow ${className}`}>
      {children}
    </div>
  );
}
