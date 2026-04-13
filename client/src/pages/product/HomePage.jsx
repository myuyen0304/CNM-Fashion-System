import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../contexts/AuthContext";
import slider2 from "../../assets/images/slider_2.webp";
import slider3 from "../../assets/images/slider_3.webp";

export default function HomePage() {
  const { token } = useAuth();
  const slides = [
    { src: slider2, alt: "Khuyến mãi thời trang 1" },
    { src: slider3, alt: "Khuyến mãi thời trang 2" },
  ];

  const [activeSlide, setActiveSlide] = useState(0);
  const [bestSellerProducts, setBestSellerProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const bestSellerTrackRef = useRef(null);
  const newProductsTrackRef = useRef(null);
  const bestSellerDragRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });
  const newProductsDragRef = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    const loadBestSellers = async () => {
      try {
        const res = await axiosClient.get("/products/popular", {
          params: { page: 1, limit: 40 },
        });
        const products = Array.isArray(res.data?.data?.products)
          ? res.data.data.products
          : [];
        const topBySold = [...products]
          .sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0))
          .slice(0, 10);
        setBestSellerProducts(topBySold);
      } catch (err) {
        console.error("Load best seller products error:", err);
        setBestSellerProducts([]);
      }
    };

    loadBestSellers();
  }, []);

  useEffect(() => {
    const loadNewestProducts = async () => {
      try {
        const res = await axiosClient.get("/products/filter", {
          params: { sortBy: "newest", page: 1 },
        });
        const products = Array.isArray(res.data?.data?.products)
          ? res.data.data.products
          : [];
        setNewProducts(products.slice(0, 10));
      } catch (err) {
        console.error("Load newest products error:", err);
        setNewProducts([]);
      }
    };

    loadNewestProducts();
  }, []);

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const endpoint = token
          ? "/products/recommendations/me"
          : "/products/recommendations";

        const res = await axiosClient.get(endpoint, {
          params: { limit: 10 },
        });

        const products = Array.isArray(res.data?.data?.products)
          ? res.data.data.products
          : [];

        setRecommendedProducts(products.slice(0, 10));
      } catch (err) {
        console.error("Load recommendations error:", err);
        setRecommendedProducts([]);
      }
    };

    loadRecommendations();
  }, [token]);

  const scrollBestSeller = (direction) => {
    if (!bestSellerTrackRef.current) return;
    const track = bestSellerTrackRef.current;
    const step = Math.max(320, Math.floor(track.clientWidth * 0.82));
    track.scrollBy({
      left: direction === "next" ? step : -step,
      behavior: "smooth",
    });
  };

  const scrollNewProducts = (direction) => {
    if (!newProductsTrackRef.current) return;
    const track = newProductsTrackRef.current;
    const step = Math.max(320, Math.floor(track.clientWidth * 0.82));
    track.scrollBy({
      left: direction === "next" ? step : -step,
      behavior: "smooth",
    });
  };

  const getPointerX = (event) => {
    if (event.touches && event.touches.length > 0)
      return event.touches[0].pageX;
    if (event.changedTouches && event.changedTouches.length > 0)
      return event.changedTouches[0].pageX;
    return event.pageX;
  };

  const startDrag = (event, trackRef, dragRef) => {
    if (!trackRef.current) return;
    if (event.button !== undefined && event.button !== 0) return;
    const x = getPointerX(event);
    dragRef.current.isDown = true;
    dragRef.current.moved = false;
    dragRef.current.startX = x - trackRef.current.offsetLeft;
    dragRef.current.scrollLeft = trackRef.current.scrollLeft;
    suppressClickRef.current = false;
  };

  const moveDrag = (event, trackRef, dragRef) => {
    if (!dragRef.current.isDown || !trackRef.current) return;
    if (event.cancelable) event.preventDefault();
    const x = getPointerX(event);
    const walk =
      (x - trackRef.current.offsetLeft - dragRef.current.startX) * 1.2;
    if (Math.abs(walk) > 4) {
      dragRef.current.moved = true;
    }
    trackRef.current.scrollLeft = dragRef.current.scrollLeft - walk;
  };

  const endDrag = (dragRef) => {
    suppressClickRef.current = dragRef.current.moved;
    dragRef.current.isDown = false;
    dragRef.current.moved = false;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handleItemClickCapture = (event) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div>
      <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 -mt-8">
        <div className="relative overflow-hidden">
          <img
            src={slides[activeSlide].src}
            alt={slides[activeSlide].alt}
            className="w-full h-[220px] md:h-[520px] object-cover transition-all duration-500"
          />
        </div>
      </section>

      <section className="py-6 md:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <article className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 flex items-center justify-center shrink-0 mt-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="w-9 h-9 text-black"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7.5l9-4.5 9 4.5-9 4.5-9-4.5z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7.5V16.5L12 21l9-4.5V7.5"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 10.5l7.5-3.75"
                  />
                </svg>
              </div>
              <p className="type-subtitle leading-snug">
                Vận chuyển <strong>MIỄN PHÍ</strong>
                <br />
                Trong khu vực <strong>TP.HCM</strong>
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 flex items-center justify-center shrink-0 mt-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="w-9 h-9 text-black"
                >
                  <rect x="3" y="4" width="14" height="10" rx="2" />
                  <circle cx="8" cy="9" r="2" />
                  <path strokeLinecap="round" d="M6 16h9M6 19h6" />
                  <circle cx="19" cy="17.5" r="2.5" />
                  <path strokeLinecap="round" d="M19 16v3M17.5 17.5h3" />
                </svg>
              </div>
              <p className="type-subtitle leading-snug">
                Tích điểm nâng hạng
                <br />
                <strong>THẺ THÀNH VIÊN</strong>
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 flex items-center justify-center shrink-0 mt-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="w-9 h-9 text-black"
                >
                  <rect x="3" y="6" width="18" height="5" rx="1.5" />
                  <path d="M6 15h12a2 2 0 012 2v1H4v-1a2 2 0 012-2z" />
                  <path strokeLinecap="round" d="M8 9h4" />
                </svg>
              </div>
              <p className="type-subtitle leading-snug">
                Tiến hành <strong>THANH TOÁN</strong>
                <br />
                Với nhiều <strong>PHƯƠNG THỨC</strong>
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 flex items-center justify-center shrink-0 mt-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="w-9 h-9 text-black"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 7l4 2.2v5.6L12 17l-4-2.2V9.2L12 7z"
                  />
                  <path strokeLinecap="round" d="M9 10.2l3 1.6 3-1.6" />
                </svg>
              </div>
              <p className="type-subtitle leading-snug">
                <strong>100% HOÀN TIỀN</strong>
                <br />
                nếu sản phẩm lỗi
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="py-3 md:py-6">
        <div className="mb-6 text-center">
          <h2 className="type-title">Sản Phẩm Bán Chạy</h2>
          <div className="mx-auto mt-3 h-1 w-48 rounded-full bg-gray-200">
            <div className="h-1 w-16 rounded-full bg-black mx-auto" />
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => scrollBestSeller("prev")}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 border border-gray-200 w-10 h-10 shadow hover:bg-white"
            aria-label="Sản phẩm trước"
          >
            ‹
          </button>

          <div
            ref={bestSellerTrackRef}
            className="flex gap-4 overflow-x-auto scroll-smooth px-12 pb-2 select-none cursor-grab active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ touchAction: "pan-y" }}
            onDragStart={(e) => e.preventDefault()}
            onMouseDown={(e) =>
              startDrag(e, bestSellerTrackRef, bestSellerDragRef)
            }
            onMouseMove={(e) =>
              moveDrag(e, bestSellerTrackRef, bestSellerDragRef)
            }
            onMouseUp={() => endDrag(bestSellerDragRef)}
            onMouseLeave={() => endDrag(bestSellerDragRef)}
            onTouchStart={(e) =>
              startDrag(e, bestSellerTrackRef, bestSellerDragRef)
            }
            onTouchMove={(e) =>
              moveDrag(e, bestSellerTrackRef, bestSellerDragRef)
            }
            onTouchEnd={() => endDrag(bestSellerDragRef)}
          >
            {bestSellerProducts.map((product, index) => (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                className="shrink-0 w-[280px] sm:w-[300px] lg:w-[320px]"
                onClickCapture={handleItemClickCapture}
              >
                <article className="group">
                  <div className="relative overflow-hidden bg-gray-100">
                    <img
                      src={product.images?.[0] || "/placeholder.jpg"}
                      alt={product.name}
                      draggable={false}
                      className="w-full h-[360px] object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute left-2 top-2 inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-black px-2 text-sm font-bold text-white">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="pt-3">
                    <h3 className="text-xl md:text-2xl font-semibold leading-snug line-clamp-2 min-h-[56px]">
                      {product.name}
                    </h3>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-2xl font-semibold text-gray-900">
                        {Number(product.price || 0).toLocaleString("vi-VN")}vnđ
                      </p>
                      <span className="rounded-full border border-black px-3 py-1 text-sm">
                        Đã bán {product.soldCount || 0}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollBestSeller("next")}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 border border-gray-200 w-10 h-10 shadow hover:bg-white"
            aria-label="Sản phẩm tiếp theo"
          >
            ›
          </button>
        </div>
      </section>

      <section className="py-3 md:py-6">
        <div className="mb-6 text-center">
          <h2 className="type-title">Sản Phẩm Mới</h2>
          <div className="mx-auto mt-3 h-1 w-48 rounded-full bg-gray-200">
            <div className="h-1 w-16 rounded-full bg-black mx-auto" />
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => scrollNewProducts("prev")}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 border border-gray-200 w-10 h-10 shadow hover:bg-white"
            aria-label="Sản phẩm mới trước"
          >
            ‹
          </button>

          <div
            ref={newProductsTrackRef}
            className="flex gap-4 overflow-x-auto scroll-smooth px-12 pb-2 select-none cursor-grab active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ touchAction: "pan-y" }}
            onDragStart={(e) => e.preventDefault()}
            onMouseDown={(e) =>
              startDrag(e, newProductsTrackRef, newProductsDragRef)
            }
            onMouseMove={(e) =>
              moveDrag(e, newProductsTrackRef, newProductsDragRef)
            }
            onMouseUp={() => endDrag(newProductsDragRef)}
            onMouseLeave={() => endDrag(newProductsDragRef)}
            onTouchStart={(e) =>
              startDrag(e, newProductsTrackRef, newProductsDragRef)
            }
            onTouchMove={(e) =>
              moveDrag(e, newProductsTrackRef, newProductsDragRef)
            }
            onTouchEnd={() => endDrag(newProductsDragRef)}
          >
            {newProducts.map((product) => (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
                className="shrink-0 w-[280px] sm:w-[300px] lg:w-[320px]"
                onClickCapture={handleItemClickCapture}
              >
                <article className="group">
                  <div className="relative overflow-hidden bg-gray-100">
                    <img
                      src={product.images?.[0] || "/placeholder.jpg"}
                      alt={product.name}
                      draggable={false}
                      className="w-full h-[360px] object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white">
                      Mới
                    </span>
                  </div>

                  <div className="pt-3">
                    <h3 className="text-xl md:text-2xl font-semibold leading-snug line-clamp-2 min-h-[56px]">
                      {product.name}
                    </h3>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-2xl font-semibold text-gray-900">
                        {Number(product.price || 0).toLocaleString("vi-VN")}vnđ
                      </p>
                      <span className="rounded-full border border-black px-3 py-1 text-sm">
                        Đã bán {product.soldCount || 0}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollNewProducts("next")}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 border border-gray-200 w-10 h-10 shadow hover:bg-white"
            aria-label="Sản phẩm mới tiếp theo"
          >
            ›
          </button>
        </div>
      </section>

      {recommendedProducts.length > 0 && (
        <section className="py-3 md:py-6">
          <div className="mb-6 text-center">
            <h2 className="type-title">Gợi Ý Cho Bạn</h2>
            <div className="mx-auto mt-3 h-1 w-48 rounded-full bg-gray-200">
              <div className="h-1 w-16 rounded-full bg-black mx-auto" />
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => scrollNewProducts("prev")}
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 border border-gray-200 w-10 h-10 shadow hover:bg-white"
              aria-label="Gợi ý trước"
            >
              ‹
            </button>

            <div className="flex gap-4 overflow-x-auto scroll-smooth px-12 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recommendedProducts.map((product) => (
                <Link
                  key={product._id}
                  to={`/products/${product._id}`}
                  className="shrink-0 w-[280px] sm:w-[300px] lg:w-[320px]"
                >
                  <article className="group">
                    <div className="relative overflow-hidden bg-gray-100">
                      <img
                        src={product.images?.[0] || "/placeholder.jpg"}
                        alt={product.name}
                        draggable={false}
                        className="w-full h-[360px] object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white">
                        AI
                      </span>
                    </div>

                    <div className="pt-3">
                      <h3 className="text-xl md:text-2xl font-semibold leading-snug line-clamp-2 min-h-[56px]">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-2xl font-semibold text-gray-900">
                          {Number(product.price || 0).toLocaleString("vi-VN")}
                          vnđ
                        </p>
                        <span className="rounded-full border border-black px-3 py-1 text-sm">
                          Đã bán {product.soldCount || 0}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollNewProducts("next")}
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 border border-gray-200 w-10 h-10 shadow hover:bg-white"
              aria-label="Gợi ý tiếp theo"
            >
              ›
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
