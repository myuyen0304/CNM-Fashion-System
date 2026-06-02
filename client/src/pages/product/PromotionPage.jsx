import { Link } from "react-router-dom";
import slider2 from "../../assets/images/slider_2.webp";
import slider3 from "../../assets/images/slider_3.webp";

const offers = [
  {
    title: "Ưu đãi phối set",
    value: "-15%",
    text: "Áp dụng khi chọn từ 2 sản phẩm bất kỳ trong cùng đơn hàng.",
  },
  {
    title: "Freeship nội thành",
    value: "0đ",
    text: "Miễn phí vận chuyển cho đơn hàng đủ điều kiện tại TP.HCM.",
  },
  {
    title: "Quà thành viên mới",
    value: "VIP",
    text: "Tích điểm và nhận ưu đãi cho những lần mua tiếp theo.",
  },
];

export default function PromotionPage() {
  return (
    <div className="pb-10">
      <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 -mt-8 overflow-hidden bg-black text-white">
        <img
          src={slider2}
          alt="Khuyến mãi PU Studio"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
        <div className="relative mx-auto grid min-h-[520px] max-w-7xl items-end px-4 py-12 md:min-h-[620px]">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/75">
              Khuyến mãi
            </p>
            <h1 className="mt-3 text-5xl font-bold leading-tight text-white md:text-7xl">
              Ưu đãi cho tủ đồ mới của bạn.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/85">
              Khám phá các chương trình mua sắm đang được áp dụng và chọn những
              thiết kế phù hợp nhất cho mùa này.
            </p>
            <Link
              to="/shop"
              className="mt-8 inline-flex bg-white px-7 py-3 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-gray-200"
            >
              Mua sắm ngay
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500">
              Đang áp dụng
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Chương trình nổi bật
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-gray-600">
            Ưu đãi có thể thay đổi theo từng thời điểm và điều kiện đơn hàng.
            Vui lòng kiểm tra lại tại bước thanh toán.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {offers.map((offer) => (
            <article key={offer.title} className="border border-gray-200 p-6">
              <div className="font-display text-6xl font-bold">
                {offer.value}
              </div>
              <h3 className="mt-6 text-2xl font-bold">{offer.title}</h3>
              <p className="mt-3 text-base leading-7 text-gray-600">
                {offer.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid overflow-hidden bg-black text-white md:grid-cols-2">
        <img
          src={slider3}
          alt="Bộ sưu tập ưu đãi"
          className="h-[360px] w-full object-cover md:h-full"
        />
        <div className="p-8 md:p-12">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/70">
            Style deal
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white md:text-5xl">
            Chọn sản phẩm chủ lực, phối thêm một món mới.
          </h2>
          <p className="mt-5 text-base leading-7 text-white/75">
            Một chiếc đầm dễ mặc, áo cardigan mỏng hoặc quần jeans ống đứng có
            thể giúp tủ đồ hiện tại linh hoạt hơn mà không cần mua quá nhiều.
          </p>
          <Link
            to="/shop"
            className="mt-8 inline-flex bg-white px-7 py-3 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-gray-200"
          >
            Xem danh mục
          </Link>
        </div>
      </section>
    </div>
  );
}
