import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import ProductCard from "../../components/ProductCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import Button from "../../components/ui/Button";
import SectionHeading from "../../components/ui/SectionHeading";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [filterError, setFilterError] = useState("");

  useEffect(() => {
    if (q) {
      search(page);
    }
  }, [q, page]);

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

  const search = async (targetPage = page) => {
    try {
      setLoading(true);
      let response;

      if (q) {
        response = await axiosClient.get("/products/search", {
          params: {
            q,
            categories:
              selectedCategories.length > 0
                ? selectedCategories.join(",")
                : undefined,
            minPrice: minPrice || undefined,
            maxPrice: maxPrice || undefined,
            minRating: minRating || undefined,
            sortBy,
            page: targetPage,
          },
        });
      } else {
        response = await axiosClient.get("/products/filter", {
          params: {
            categories:
              selectedCategories.length > 0
                ? selectedCategories.join(",")
                : undefined,
            minPrice: minPrice || undefined,
            maxPrice: maxPrice || undefined,
            minRating: minRating || undefined,
            sortBy,
            page: targetPage,
          },
        });
      }

      setProducts(response.data.data.products);
      setTotalPages(response.data.data.totalPages);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
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
    setPage(1);
    search(1);
    setIsFilterOpen(false);
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

  if (loading && page === 1) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:hidden -mb-3">
        <Button
          type="button"
          onClick={() => setIsFilterOpen((prev) => !prev)}
          variant="secondary"
          className="w-full py-3"
        >
          {isFilterOpen ? "Ẩn bộ lọc" : "Mở bộ lọc"}
        </Button>
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
          <label className="block text-sm font-medium mb-2">Đánh giá tối thiểu</label>
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

        <Button onClick={handleFilter} className="w-full">
          Áp dụng lọc
        </Button>
        {filterError && <p className="text-red-600 text-sm mt-3">{filterError}</p>}
      </div>

      <div className="lg:col-span-3">
        <SectionHeading
          title={q ? `Kết quả tìm kiếm: "${q}"` : "Kết quả lọc"}
          className="mb-6"
        />

        {products.length === 0 ? (
          <EmptyState title="Không tìm thấy sản phẩm" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage(Math.max(1, page - 1))}
              onNext={() => setPage(Math.min(totalPages, page + 1))}
            />
          </>
        )}
      </div>
    </div>
  );
}
