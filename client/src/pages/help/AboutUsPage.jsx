import { Link } from "react-router-dom";
import slider2 from "../../assets/images/slider_2.webp";
import newArrival from "../../assets/images/new_arrival.webp";

const values = [
  {
    title: "Thiết kế dễ mặc",
    text: "PU Studio ưu tiên phom dáng ứng dụng, chất liệu thoải mái và chi tiết vừa đủ để khách hàng mặc đẹp trong nhiều hoàn cảnh.",
  },
  {
    title: "Tủ đồ bền phong cách",
    text: "Mỗi sản phẩm được chọn theo hướng phối được nhiều lần, không phụ thuộc vào xu hướng quá ngắn hạn.",
  },
  {
    title: "Dịch vụ gần gũi",
    text: "Từ tư vấn size đến hỗ trợ sau mua, trải nghiệm mua sắm được xây dựng để rõ ràng, nhanh và thân thiện.",
  },
];

const stats = [
  { value: "10+", label: "Nhóm sản phẩm chủ lực" },
  { value: "24h", label: "Phản hồi hỗ trợ" },
  { value: "100%", label: "Cam kết xử lý sản phẩm lỗi" },
];

export default function AboutUsPage() {
  return (
    <div className="pb-10">
      <section className="grid gap-8 py-10 md:grid-cols-[0.95fr_1.05fr] md:items-center md:py-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500">
            Về PU Studio
          </p>
          <h1 className="mt-3 text-5xl font-bold leading-tight md:text-7xl">
            Thời trang hiện đại cho nhịp sống mỗi ngày.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Chúng tôi xây dựng những lựa chọn thời trang nữ và nam theo tinh
            thần thanh lịch, dễ phối và đủ linh hoạt cho công việc, dạo phố,
            gặp gỡ bạn bè hoặc những buổi hẹn đặc biệt.
          </p>
          <Link
            to="/shop"
            className="mt-8 inline-flex bg-black px-7 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-gray-800"
          >
            Xem sản phẩm
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-[0.75fr_1fr]">
          <img
            src={newArrival}
            alt="Bộ sưu tập PU Studio"
            className="h-[420px] w-full object-cover sm:mt-12"
          />
          <img
            src={slider2}
            alt="Không gian thời trang PU Studio"
            className="h-[520px] w-full object-cover"
          />
        </div>
      </section>

      <section className="grid gap-4 border-y border-gray-200 py-8 md:grid-cols-3">
        {stats.map((item) => (
          <article key={item.label} className="py-4">
            <div className="font-display text-4xl font-bold">{item.value}</div>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-gray-500">
              {item.label}
            </p>
          </article>
        ))}
      </section>

      <section className="py-12 md:py-16">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500">
            Điều chúng tôi theo đuổi
          </p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">
            Một trải nghiệm mua sắm gọn gàng, đẹp mắt và đáng tin.
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {values.map((item, index) => (
            <article key={item.title} className="border border-gray-200 p-6">
              <div className="font-display text-4xl font-bold text-gray-300">
                {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-6 text-2xl font-bold">{item.title}</h3>
              <p className="mt-3 text-base leading-7 text-gray-600">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
