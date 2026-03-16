export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-20 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-4">Về chúng tôi</h3>
            <p className="text-gray-400">
              E-Shop - nền tảng mua sắm online uy tín với hàng triệu sản phẩm
              chất lượng.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Chính sách</h3>
            <ul className="text-gray-400 space-y-2">
              <li>
                <a href="#" className="hover:text-white transition">
                  Chính sách bảo mật
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Điều khoản sử dụng
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Hướng dẫn mua sắm
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Hỗ trợ</h3>
            <ul className="text-gray-400 space-y-2">
              <li>
                <a href="#" className="hover:text-white transition">
                  Liên hệ chúng tôi
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Câu hỏi thường gặp
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Hỗ trợ khách hàng
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Liên hệ</h3>
            <p className="text-gray-400">Email: support@eshop.vn</p>
            <p className="text-gray-400">Hotline: 1900-xxxx</p>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
          <p>&copy; 2024 E-Shop. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
