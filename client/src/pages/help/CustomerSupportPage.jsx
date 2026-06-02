import { Link } from "react-router-dom";
import slider3 from "../../assets/images/slider_3.webp";

const supportItems = [
  {
    title: "Tư vấn sản phẩm và size",
    text: "Gửi chiều cao, cân nặng và phong cách bạn muốn. Đội ngũ hỗ trợ sẽ gợi ý size và cách phối phù hợp.",
  },
  {
    title: "Theo dõi đơn hàng",
    text: "Bạn có thể kiểm tra trạng thái trong mục Đơn hàng của tôi hoặc liên hệ hỗ trợ khi cần cập nhật nhanh.",
  },
  {
    title: "Đổi trả và hoàn lại",
    text: "Các yêu cầu đổi trả được kiểm tra theo tình trạng sản phẩm, thời gian nhận hàng và chính sách hiện hành.",
  },
];

const contactChannels = [
  { label: "Hotline", value: "070 347 0938" },
  { label: "Thời gian", value: "09:00 - 21:00 mỗi ngày" },
  { label: "Phản hồi", value: "Trong vòng 24 giờ làm việc" },
];

export default function CustomerSupportPage() {
  return (
    <div className="pb-10">
      <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 -mt-8 overflow-hidden bg-black text-white">
        <img
          src={slider3}
          alt="Chăm sóc khách hàng PU Studio"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/15" />
        <div className="relative mx-auto grid min-h-[440px] max-w-7xl items-end px-4 py-12 md:min-h-[560px]">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/75">
              Chăm sóc khách hàng
            </p>
            <h1 className="mt-3 text-5xl font-bold leading-tight text-white md:text-7xl">
              Hỗ trợ nhanh, rõ ràng và đúng nhu cầu.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/85">
              PU Studio đồng hành trước, trong và sau khi mua để bạn chọn đúng
              sản phẩm và xử lý mọi vấn đề thuận tiện hơn.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {supportItems.map((item) => (
            <article key={item.title} className="border border-gray-200 p-6">
              <h2 className="text-2xl font-bold">{item.title}</h2>
              <p className="mt-3 text-base leading-7 text-gray-600">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 border-y border-gray-200 py-10 md:grid-cols-[0.8fr_1.2fr] md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500">
            Liên hệ
          </p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">
            Cần hỗ trợ trực tiếp?
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Chat với đội ngũ hỗ trợ để được kiểm tra đơn hàng, tư vấn đổi trả
            hoặc gợi ý sản phẩm phù hợp.
          </p>
          <Link
            to="/chat"
            className="mt-7 inline-flex bg-black px-7 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-gray-800"
          >
            Mở chat hỗ trợ
          </Link>
        </div>
        <div className="grid gap-3">
          {contactChannels.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 border border-gray-200 px-5 py-4"
            >
              <span className="font-semibold text-gray-500">{item.label}</span>
              <span className="text-right font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
