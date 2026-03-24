import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import ProductCard from "../../components/ProductCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import SectionHeading from "../../components/ui/SectionHeading";
import PriceTag from "../../components/ui/PriceTag";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [adding, setAdding] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { addItem } = useCart();
  const { token } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const productRes = await axiosClient.get(`/products/${id}`);
        const currentProduct = productRes.data.data;
        const availableSizes = Array.isArray(currentProduct?.sizes)
          ? currentProduct.sizes
          : typeof currentProduct?.size === "string"
            ? currentProduct.size
                .split("|")
                .map((size) => size.trim().toUpperCase())
                .filter(Boolean)
            : [];

        setProduct(currentProduct);
        setSelectedSize(availableSizes[0] || "");

        const [similarRes, reviewsRes] = await Promise.allSettled([
          axiosClient.get(`/products/${id}/similar`),
          axiosClient.get(`/reviews/product/${id}`),
        ]);

        if (similarRes.status === "fulfilled") {
          setSimilar(similarRes.value.data.data || []);
        } else {
          setSimilar([]);
        }

        if (reviewsRes.status === "fulfilled") {
          setReviews(reviewsRes.value.data.data.reviews || []);
        } else {
          setReviews([]);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setProduct(null);
          setSimilar([]);
          setReviews([]);
          setNotFound(true);
          return;
        }

        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [id]);

  const handleAddToCart = async () => {
    if (!token) {
      alert("Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");
      navigate("/login");
      return;
    }

    try {
      setAdding(true);
      await addItem(product._id, quantity, selectedSize);
      alert("Đã thêm vào giỏ hàng");
    } catch (err) {
      if (err.response?.status === 401) {
        alert("Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");
        navigate("/login");
        return;
      }
      alert(err.response?.data?.message || "Lỗi");
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (notFound) {
    return (
      <Card className="p-6 text-center">
        <p className="text-lg font-semibold mb-3">Không tìm thấy sản phẩm</p>
        <p className="text-gray-600 mb-4">
          Sản phẩm này có thể đã bị xóa sau khi cập nhật lại dữ liệu.
        </p>
        <Link to="/">
          <Button className="px-6 py-2">Quay về trang chủ</Button>
        </Link>
      </Card>
    );
  }
  if (!product) return <div>Không tìm thấy sản phẩm</div>;

  const availableSizes = Array.isArray(product.sizes)
    ? product.sizes
    : typeof product.size === "string"
      ? product.size
          .split("|")
          .map((size) => size.trim().toUpperCase())
          .filter(Boolean)
      : [];

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div>
          <img
            src={product.images?.[0] || "/placeholder.jpg"}
            alt={product.name}
            className="w-full rounded-lg"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center text-yellow-500">
              ★ {product.avgRating} ({reviews.length} đánh giá)
            </div>
            <div className="text-gray-500">Đã bán {product.soldCount}</div>
          </div>

          <PriceTag
            value={product.price}
            className="text-4xl mb-6 inline-block"
          />

          <p className="text-gray-700 mb-6">{product.description}</p>

          {availableSizes.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-medium mb-2">Chọn size:</div>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => {
                  const isActive = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded border font-medium transition-colors ${
                        isActive
                          ? "border-primary bg-primary text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-primary"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            <label>Số lượng:</label>
            <input
              type="number"
              min="1"
              max={product.stock}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="input-field w-20"
            />
            <span className="text-gray-500">Còn {product.stock} sản phẩm</span>
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={adding || product.stock === 0}
            variant="secondary"
            className="px-8 py-3 text-lg"
          >
            {adding ? "Đang thêm..." : "Thêm vào giỏ hàng"}
          </Button>
        </div>
      </div>

      <section className="mb-12">
        <SectionHeading title="Đánh giá từ khách hàng" className="mb-6" />
        {reviews.length === 0 ? (
          <p className="text-gray-500">Chưa có đánh giá</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review._id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold">
                      {review.customerId?.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {review.createdAt
                        ? new Date(review.createdAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </div>
                  </div>
                  <div className="text-yellow-500">
                    {"★".repeat(review.rating)}
                  </div>
                </div>
                <p className="text-gray-700">{review.comment}</p>
                {review.imageUrl && (
                  <img
                    src={review.imageUrl}
                    alt=""
                    className="mt-3 max-w-xs rounded"
                  />
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {similar.length > 0 && (
        <section>
          <SectionHeading title="Sản phẩm tương tự" className="mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similar.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
