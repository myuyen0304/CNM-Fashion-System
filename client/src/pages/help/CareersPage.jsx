import slider2 from "../../assets/images/slider_2.webp";

const openings = [
  {
    role: "Nhân viên bán hàng",
    type: "Full-time / Part-time",
    detail: "Tư vấn khách hàng, chăm sóc quầy kệ, hỗ trợ thử đồ và xử lý đơn tại cửa hàng.",
  },
  {
    role: "Stylist nội dung",
    type: "Part-time",
    detail: "Lên ý tưởng phối đồ, hỗ trợ chụp lookbook và biên tập nội dung mạng xã hội.",
  },
  {
    role: "Nhân viên vận hành đơn",
    type: "Full-time",
    detail: "Kiểm tra tồn kho, đóng gói, bàn giao vận chuyển và theo dõi trạng thái đơn hàng.",
  },
];

const benefits = [
  "Môi trường thời trang trẻ, rõ quy trình",
  "Được đào tạo sản phẩm và kỹ năng tư vấn",
  "Ưu đãi mua hàng nội bộ",
  "Lịch làm việc linh hoạt theo vị trí",
];

export default function CareersPage() {
  return (
    <div className="pb-10">
      <section className="grid gap-8 py-10 md:grid-cols-[1fr_0.9fr] md:items-center md:py-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500">
            Tuyển dụng & Việc làm
          </p>
          <h1 className="mt-3 text-5xl font-bold leading-tight md:text-7xl">
            Cùng xây dựng trải nghiệm thời trang đẹp hơn.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            PU Studio tìm kiếm những thành viên yêu thời trang, làm việc chỉn
            chu và muốn tạo ra trải nghiệm mua sắm có gu cho khách hàng.
          </p>
        </div>
        <img
          src={slider2}
          alt="Tuyển dụng PU Studio"
          className="h-[520px] w-full object-cover"
        />
      </section>

      <section className="grid gap-8 border-y border-gray-200 py-10 md:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500">
            Quyền lợi
          </p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">
            Làm việc trong môi trường có nhịp độ và gu thẩm mỹ.
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {benefits.map((item) => (
            <div key={item} className="border border-gray-200 px-5 py-4">
              <span className="font-semibold">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500">
            Vị trí đang mở
          </p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">
            Gia nhập đội ngũ PU Studio
          </h2>
        </div>
        <div className="grid gap-5">
          {openings.map((item) => (
            <article
              key={item.role}
              className="grid gap-4 border border-gray-200 p-6 md:grid-cols-[0.6fr_0.4fr_1fr] md:items-center"
            >
              <h3 className="text-2xl font-bold">{item.role}</h3>
              <span className="w-fit border border-gray-300 px-3 py-1 text-sm font-semibold">
                {item.type}
              </span>
              <p className="text-base leading-7 text-gray-600">
                {item.detail}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
