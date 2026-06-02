import { Link } from "react-router-dom";
import slider2 from "../../assets/images/slider_2.webp";
import slider3 from "../../assets/images/slider_3.webp";
import newArrival from "../../assets/images/new_arrival.webp";

const featuredStories = [
  {
    title: "Tối giản nhưng có điểm nhấn: công thức mặc đẹp mỗi ngày",
    category: "Style Guide",
    date: "15.06.2026",
    image: slider2,
    excerpt:
      "Những phom dáng sạch, màu trung tính và một chi tiết nổi bật giúp set đồ công sở lẫn dạo phố trở nên gọn gàng hơn.",
  },
  {
    title: "Đầm nữ mùa này: nhẹ, mềm và dễ chuyển từ ngày sang tối",
    category: "Trend Report",
    date: "12.06.2026",
    image: newArrival,
    excerpt:
      "Ưu tiên chất liệu có độ rũ, đường cắt vừa vặn và phụ kiện nhỏ để giữ tổng thể thanh lịch.",
  },
  {
    title: "Denim quay lại với cách phối tinh giản hơn",
    category: "Mix & Match",
    date: "09.06.2026",
    image: slider3,
    excerpt:
      "Quần jeans ống đứng, áo thun trơn và cardigan mỏng là bộ ba dễ mặc cho lịch trình bận rộn.",
  },
];

const trendNotes = [
  "Phom suông vừa người",
  "Đen, trắng, xanh denim",
  "Cardigan mỏng",
  "Đầm midi tối giản",
  "Áo polo phối chân váy",
  "Túi nhỏ cấu trúc cứng",
];

const outfitGuides = [
  {
    title: "Đi làm",
    text: "Áo sơ mi sáng màu, quần ống suông và giày mũi nhọn tạo cảm giác chuyên nghiệp mà không cứng.",
  },
  {
    title: "Cuối tuần",
    text: "Áo thun cotton, jeans xanh và cardigan là lựa chọn nhanh, dễ mặc, hợp nhiều dáng người.",
  },
  {
    title: "Dự tiệc nhẹ",
    text: "Đầm trơn, khuyên tai nhỏ và sandal quai mảnh giúp tổng thể sang hơn mà vẫn thoải mái.",
  },
];

export default function FashionNewsPage() {
  const mainStory = featuredStories[0];
  const secondaryStories = featuredStories.slice(1);

  return (
    <div className="pb-10">
      <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 -mt-8 overflow-hidden bg-neutral-950 text-white">
        <img
          src={mainStory.image}
          alt={mainStory.title}
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
        <div className="relative mx-auto grid min-h-[520px] max-w-7xl items-end px-4 py-12 md:min-h-[620px] md:py-16">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/80">
              <span>{mainStory.category}</span>
              <span className="h-1 w-1 rounded-full bg-white/70" />
              <span>{mainStory.date}</span>
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight text-white md:text-7xl">
              Tin Tức Thời Trang
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/85 md:text-xl">
              Cập nhật cảm hứng phối đồ, xu hướng ứng dụng và những lựa chọn
              mới cho tủ đồ hiện đại.
            </p>
            <Link
              to="/shop"
              className="mt-8 inline-flex items-center rounded-none bg-white px-7 py-3 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-gray-200"
            >
              Khám phá bộ sưu tập
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500">
              Bài nổi bật
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Gợi ý mặc đẹp trong tuần
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-gray-600">
            Chọn trang phục theo nhịp sống thực tế: dễ phối, dễ chăm sóc và có
            điểm nhấn đủ tinh tế.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="group grid overflow-hidden border border-gray-200 bg-white md:grid-cols-[0.95fr_1.05fr]">
            <div className="overflow-hidden bg-gray-100">
              <img
                src={mainStory.image}
                alt={mainStory.title}
                className="h-full min-h-[360px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col justify-end p-6 md:p-8">
              <div className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                {mainStory.category} / {mainStory.date}
              </div>
              <h3 className="text-3xl font-bold leading-tight md:text-4xl">
                {mainStory.title}
              </h3>
              <p className="mt-5 text-base leading-7 text-gray-600">
                {mainStory.excerpt}
              </p>
              <Link
                to="/shop"
                className="mt-8 inline-flex w-fit border-b border-black pb-1 text-sm font-bold uppercase tracking-[0.14em]"
              >
                Xem sản phẩm phù hợp
              </Link>
            </div>
          </article>

          <div className="grid gap-6">
            {secondaryStories.map((story) => (
              <article
                key={story.title}
                className="group grid grid-cols-[132px_1fr] overflow-hidden border border-gray-200 bg-white sm:grid-cols-[180px_1fr]"
              >
                <div className="overflow-hidden bg-gray-100">
                  <img
                    src={story.image}
                    alt={story.title}
                    className="h-full min-h-[190px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    {story.category}
                  </div>
                  <h3 className="text-xl font-bold leading-snug">
                    {story.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                    {story.excerpt}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 py-10 md:py-12">
        <div className="grid gap-8 md:grid-cols-[0.55fr_1fr] md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500">
              Moodboard
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Những tín hiệu đang được yêu thích
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {trendNotes.map((note) => (
              <span
                key={note}
                className="border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800"
              >
                {note}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500">
              Cẩm nang phối đồ
            </p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">
              Ba công thức dễ áp dụng
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600">
              Tập trung vào phom dáng, chất liệu và tỉ lệ trang phục để mỗi set
              đồ trông chỉn chu hơn mà không cần quá nhiều món.
            </p>
          </div>

          <div className="grid gap-4">
            {outfitGuides.map((guide, index) => (
              <article
                key={guide.title}
                className="grid grid-cols-[56px_1fr] border border-gray-200 bg-white p-5 md:grid-cols-[76px_1fr] md:p-6"
              >
                <div className="font-display text-4xl font-bold text-gray-300">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{guide.title}</h3>
                  <p className="mt-2 text-base leading-7 text-gray-600">
                    {guide.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black px-6 py-12 text-white md:px-10 md:py-16">
        <img
          src={slider3}
          alt="Bộ sưu tập thời trang"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/70">
              PU Studio
            </p>
            <h2 className="mt-2 max-w-3xl text-3xl font-bold text-white md:text-5xl">
              Làm mới tủ đồ bằng những thiết kế dễ mặc và bền phong cách.
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex w-fit items-center bg-white px-7 py-3 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-gray-200"
          >
            Mua sắm ngay
          </Link>
        </div>
      </section>
    </div>
  );
}
