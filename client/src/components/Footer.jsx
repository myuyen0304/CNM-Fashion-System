export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-100 mt-20 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white font-semibold text-xl mb-4">Về chúng tôi</h3>
            <p className="text-slate-300 text-base leading-relaxed">
              PU STUDIO - nền tảng mua sắm online uy tín với hàng triệu sản phẩm chất lượng.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-xl mb-4">Chính sách</h3>
            <ul className="text-slate-300 space-y-2 text-base">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Chính sách bảo mật
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Điều khoản sử dụng
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Hướng dẫn mua sắm
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-xl mb-4">Hỗ trợ</h3>
            <ul className="text-slate-300 space-y-2 text-base">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Liên hệ chúng tôi
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Câu hỏi thường gặp
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Hỗ trợ khách hàng
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-xl mb-4">Liên hệ</h3>
            <p className="text-slate-300 text-base">Email: support@pustudio.vn</p>
            <p className="text-slate-300 text-base">Hotline: 1900-xxxx</p>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-8 text-center text-slate-400 text-base">
          <p>&copy; Bản quyền thuộc về PU STUDIO | Cung cấp bởi PU Team.</p>
        </div>
      </div>
    </footer>
  );
}
