const policies = [
  {
    title: "Đổi trả sản phẩm",
    points: [
      "Sản phẩm còn nguyên tem, chưa qua sử dụng và còn hóa đơn mua hàng.",
      "Yêu cầu đổi trả cần được gửi trong thời gian chính sách đang áp dụng.",
      "Sản phẩm lỗi do nhà sản xuất sẽ được kiểm tra và hỗ trợ xử lý theo tình trạng thực tế.",
    ],
  },
  {
    title: "Thanh toán",
    points: [
      "Hỗ trợ các phương thức thanh toán đang hiển thị ở bước checkout.",
      "Đơn hàng chỉ được xử lý sau khi hệ thống xác nhận thanh toán hoặc đặt hàng thành công.",
      "Thông tin giao dịch được dùng để đối soát và hỗ trợ khi có phát sinh.",
    ],
  },
  {
    title: "Giao hàng",
    points: [
      "Thời gian giao hàng phụ thuộc vào khu vực nhận hàng và đơn vị vận chuyển.",
      "Khách hàng nên kiểm tra thông tin người nhận trước khi xác nhận đơn.",
      "Nếu giao hàng không thành công, đội ngũ hỗ trợ sẽ liên hệ để xác nhận lại.",
    ],
  },
  {
    title: "Bảo mật thông tin",
    points: [
      "Thông tin cá nhân chỉ được dùng cho mục đích xử lý đơn, chăm sóc khách hàng và cải thiện dịch vụ.",
      "PU Studio không chia sẻ dữ liệu khách hàng cho bên thứ ba ngoài phạm vi vận hành đơn hàng.",
      "Khách hàng có thể cập nhật thông tin tài khoản trong trang cá nhân.",
    ],
  },
];

export default function PolicyPage() {
  return (
    <div className="pb-10">
      <section className="border-b border-gray-200 py-10 md:py-14">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-500">
          Chính sách
        </p>
        <h1 className="mt-3 max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
          Rõ ràng từ mua sắm đến hậu mãi.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600">
          Các chính sách dưới đây giúp khách hàng nắm được nguyên tắc đổi trả,
          thanh toán, giao hàng và bảo mật khi mua sắm tại PU Studio.
        </p>
      </section>

      <section className="grid gap-5 py-12 md:grid-cols-2 md:py-16">
        {policies.map((policy) => (
          <article key={policy.title} className="border border-gray-200 p-6">
            <h2 className="text-3xl font-bold">{policy.title}</h2>
            <ul className="mt-5 space-y-4">
              {policy.points.map((point) => (
                <li key={point} className="flex gap-3 text-base leading-7 text-gray-600">
                  <span className="mt-2 h-2 w-2 shrink-0 bg-black" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
