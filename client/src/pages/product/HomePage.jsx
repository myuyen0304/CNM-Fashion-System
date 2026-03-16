import { useCallback, useEffect, useRef, useState } from "react";
import axiosClient from "../../api/axiosClient";
import ProductCard from "../../components/ProductCard";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [filterError, setFilterError] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    categories: [],
    minPrice: "",
    maxPrice: "",
    minRating: "",
    sortBy: "popular",
  });
  const productSectionRef = useRef(null);
  const PAGE_SIZE = 40;

  const scrollToProducts = () => {
    if (!productSectionRef.current) return;
    productSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const fetchProducts = useCallback(
    async (targetPage = 1) => {
      setLoading(true);

      try {
        const hasFilter =
          appliedFilters.categories.length > 0 ||
          Boolean(appliedFilters.minPrice) ||
          Boolean(appliedFilters.maxPrice) ||
          Boolean(appliedFilters.minRating) ||
          appliedFilters.sortBy !== "popular";

        let response;
        if (hasFilter) {
          response = await axiosClient.get("/products/filter", {
            params: {
              categories:
                appliedFilters.categories.length > 0
                  ? appliedFilters.categories.join(",")
                  : undefined,
              minPrice: appliedFilters.minPrice || undefined,
              maxPrice: appliedFilters.maxPrice || undefined,
              minRating: appliedFilters.minRating || undefined,
              sortBy: appliedFilters.sortBy,
              page: targetPage,
            },
          });
        } else {
          response = await axiosClient.get(
            `/products/popular?page=${targetPage}&limit=${PAGE_SIZE}`,
          );
        }

        const payload = response.data?.data;

        if (Array.isArray(payload)) {
          setProducts(payload);
          setTotalPages(
            payload.length < PAGE_SIZE ? targetPage : targetPage + 1,
          );
          return;
        }

        const nextProducts = payload?.products || [];
        const nextTotalPages = payload?.totalPages || 1;

        setProducts(nextProducts);
        setTotalPages(nextTotalPages);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    [PAGE_SIZE, appliedFilters],
  );

  useEffect(() => {
    fetchProducts(page);
  }, [fetchProducts, page]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await axiosClient.get("/products/categories");
        setCategories(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) {
        console.error("Load categories error:", err);
      }
    };

    loadCategories();
  }, []);

  const handleCategoryToggle = (categoryName) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((item) => item !== categoryName)
        : [...prev, categoryName],
    );
  };

  const handleNonNegativePriceChange = (setter) => (e) => {
    const nextValue = e.target.value;
    if (nextValue === "") {
      setter("");
      return;
    }

    const numericValue = Number(nextValue);
    if (!Number.isNaN(numericValue) && numericValue >= 0) {
      setter(nextValue);
    }
  };

  const applyFilters = () => {
    const parsedMinPrice = minPrice === "" ? undefined : Number(minPrice);
    const parsedMaxPrice = maxPrice === "" ? undefined : Number(maxPrice);

    if (parsedMinPrice !== undefined && parsedMinPrice < 0) {
      setFilterError("Giá tối thiểu không được là số âm.");
      return;
    }

    if (parsedMaxPrice !== undefined && parsedMaxPrice < 0) {
      setFilterError("Giá tối đa không được là số âm.");
      return;
    }

    if (
      parsedMinPrice !== undefined &&
      parsedMaxPrice !== undefined &&
      parsedMinPrice > parsedMaxPrice
    ) {
      setFilterError("Giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa.");
      return;
    }

    setFilterError("");
    setAppliedFilters({
      categories: selectedCategories,
      minPrice,
      maxPrice,
      minRating,
      sortBy,
    });
    setPage(1);
    setIsFilterOpen(false);
    scrollToProducts();
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setMinPrice("");
    setMaxPrice("");
    setMinRating("");
    setSortBy("popular");
    setFilterError("");
    setAppliedFilters({
      categories: [],
      minPrice: "",
      maxPrice: "",
      minRating: "",
      sortBy: "popular",
    });
    setPage(1);
    setIsFilterOpen(false);
    scrollToProducts();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg p-12 mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Chào mừng đến E-Shop</h1>
        <p className="text-xl">
          Tìm kiếm hàng ngàn sản phẩm chất lượng với giá tốt nhất
        </p>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:hidden -mt-2">
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="w-full btn-secondary py-3"
          >
            {isFilterOpen ? "Ẩn bộ lọc" : "Mở bộ lọc"}
          </button>
        </div>

        <div
          className={`lg:col-span-1 card p-6 h-fit lg:sticky lg:top-24 ${
            isFilterOpen ? "block" : "hidden lg:block"
          }`}
        >
          <h3 className="font-bold text-lg mb-4">Lọc</h3>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Danh mục</label>
            <div className="max-h-52 overflow-auto border border-gray-200 rounded-lg p-3 space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có danh mục</p>
              ) : (
                categories.map((item) => (
                  <label
                    key={item}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(item)}
                      onChange={() => handleCategoryToggle(item)}
                    />
                    <span>{item}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Khoảng giá</label>
            <input
              type="number"
              className="input-field mb-2"
              value={minPrice}
              min="0"
              onChange={handleNonNegativePriceChange(setMinPrice)}
              placeholder="Giá tối thiểu"
            />
            <input
              type="number"
              className="input-field"
              value={maxPrice}
              min="0"
              onChange={handleNonNegativePriceChange(setMaxPrice)}
              placeholder="Giá tối đa"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Đánh giá tối thiểu
            </label>
            <select
              className="input-field"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="4">Đánh giá cao (từ 4 sao)</option>
              <option value="3">Từ 3 sao</option>
              <option value="2">Từ 2 sao</option>
              <option value="1">Từ 1 sao</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Sắp xếp</label>
            <select
              className="input-field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="popular">Phổ biến</option>
              <option value="price_asc">Giá thấp → cao</option>
              <option value="price_desc">Giá cao → thấp</option>
              <option value="newest">Mới nhất</option>
              <option value="rating">Đánh giá cao</option>
            </select>
          </div>

          <div className="space-y-3">
            <button onClick={applyFilters} className="btn-primary w-full">
              Áp dụng lọc
            </button>
            <button onClick={clearFilters} className="btn-secondary w-full">
              Xóa lọc
            </button>
          </div>

          {filterError && (
            <p className="text-red-600 text-sm mt-3">{filterError}</p>
          )}
        </div>

        <div ref={productSectionRef} className="lg:col-span-4">
          <h2 className="text-3xl font-bold mb-8">
            {appliedFilters.categories.length > 0 ||
            appliedFilters.minPrice ||
            appliedFilters.maxPrice ||
            appliedFilters.minRating ||
            appliedFilters.sortBy !== "popular"
              ? "Kết quả lọc"
              : "Sản phẩm phổ biến"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>

          {products.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                className="btn-secondary px-4 py-2 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                Trang trước
              </button>

              <span className="px-3 py-2 text-sm text-gray-700">
                Trang {page} / {totalPages}
              </span>

              <button
                className="btn-secondary px-4 py-2 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages))
                }
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
