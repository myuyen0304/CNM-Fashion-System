# Test Cases

Tài liệu testcase cho project CNM Fashion System. Format được chỉnh theo mẫu gồm: Case ID, Scenario, các bước kiểm tra, dữ liệu test, kết quả mong đợi và trạng thái.

## Thông Tin Chung

- Client URL: `http://localhost:5173`
- Server URL: `http://localhost:5000`
- API base URL: `http://localhost:5000/api`
- Database: MongoDB theo cấu hình trong `server/.env`

## Tài Khoản Test Đề Xuất

| Role | Email | Password | Ghi chú |
| --- | --- | --- | --- |
| Admin | `admin.test@cnn.com` | `Admin12345` | Quản lý user, sản phẩm, đơn hàng |
| Supervisor | `supervisor@test.com` | `Supervisor12345` | Quản lý sản phẩm, đơn hàng |
| Employee | `employee.test@cnn.com` | `Employee12345` | Xử lý đơn hàng, hỗ trợ khách hàng |
| Customer | Tạo mới bằng màn hình đăng ký | Tùy chọn | Test mua hàng |

## Bảng Testcase

| Case ID | Scenario | Các bước kiểm tra | Dữ liệu Test (Input Data) | Kết quả mong đợi | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| TC-01 | Đăng ký tài khoản customer thành công | 1. Vào trang `/register`.<br>2. Nhập đầy đủ thông tin hợp lệ.<br>3. Bấm đăng ký. | Tên: Nguyễn Văn A<br>Email: customer01@test.com<br>Password: Customer12345 | Hệ thống tạo tài khoản thành công và yêu cầu xác thực OTP/email. | Chưa test |
| TC-02 | Đăng ký với email sai định dạng | 1. Vào trang `/register`.<br>2. Nhập email sai định dạng.<br>3. Bấm đăng ký. | Tên: Nguyễn Văn A<br>Email: customer01<br>Password: Customer12345 | Hiển thị thông báo email không hợp lệ. | Chưa test |
| TC-03 | Đăng ký bằng email đã tồn tại | 1. Vào trang `/register`.<br>2. Nhập email đã có trong hệ thống.<br>3. Bấm đăng ký. | Tên: Nguyễn Văn A<br>Email: admin.test@cnn.com<br>Password: Customer12345 | Hiển thị thông báo email đã tồn tại. | Chưa test |
| TC-04 | Xác thực OTP thành công | 1. Vào trang `/verify-email`.<br>2. Nhập email và OTP đúng.<br>3. Bấm xác thực. | Email: customer01@test.com<br>OTP: OTP được gửi qua email/log | Tài khoản được xác thực và có thể đăng nhập. | Chưa test |
| TC-05 | Xác thực OTP sai | 1. Vào trang `/verify-email`.<br>2. Nhập email và OTP sai.<br>3. Bấm xác thực. | Email: customer01@test.com<br>OTP: 000000 | Hiển thị thông báo OTP không chính xác. | Chưa test |
| TC-06 | Đăng nhập thành công | 1. Vào trang `/login`.<br>2. Nhập email và password đúng.<br>3. Bấm đăng nhập. | Email: supervisor@test.com<br>Password: Supervisor12345 | Đăng nhập thành công, lưu token và chuyển đến trang phù hợp. | Chưa test |
| TC-07 | Đăng nhập sai mật khẩu | 1. Vào trang `/login`.<br>2. Nhập email đúng và password sai.<br>3. Bấm đăng nhập. | Email: supervisor@test.com<br>Password: WrongPassword123 | Hiển thị thông báo đăng nhập thất bại. | Chưa test |
| TC-08 | Đăng xuất | 1. Đăng nhập vào hệ thống.<br>2. Bấm nút logout. | User đã đăng nhập | Token bị xóa, user trở về trạng thái chưa đăng nhập. | Chưa test |
| TC-09 | Quên mật khẩu | 1. Vào trang `/forgot-password`.<br>2. Nhập email hợp lệ.<br>3. Bấm gửi yêu cầu. | Email: customer01@test.com | Hệ thống gửi OTP đặt lại mật khẩu. | Chưa test |
| TC-10 | Đặt lại mật khẩu thành công | 1. Vào trang `/reset-password`.<br>2. Nhập email, OTP và password mới.<br>3. Bấm đặt lại mật khẩu. | Email: customer01@test.com<br>OTP: OTP hợp lệ<br>Password mới: NewPass12345 | Password được cập nhật, user đăng nhập được bằng password mới. | Chưa test |
| TC-11 | Customer không được vào trang staff | 1. Đăng nhập bằng tài khoản customer.<br>2. Truy cập `/staff`. | Role: customer | Hệ thống chặn truy cập hoặc redirect về trang phù hợp. | Chưa test |
| TC-12 | Employee vào được dashboard staff | 1. Đăng nhập bằng tài khoản employee.<br>2. Truy cập `/staff`. | Email: employee.test@cnn.com<br>Password: Employee12345 | Hiển thị dashboard staff. | Chưa test |
| TC-13 | Employee không vào được quản lý sản phẩm | 1. Đăng nhập bằng tài khoản employee.<br>2. Truy cập `/staff/products`. | Role: employee | Hệ thống chặn truy cập hoặc redirect. | Chưa test |
| TC-14 | Supervisor vào được quản lý sản phẩm | 1. Đăng nhập bằng tài khoản supervisor.<br>2. Truy cập `/staff/products`. | Email: supervisor@test.com<br>Password: Supervisor12345 | Hiển thị trang quản lý sản phẩm. | Chưa test |
| TC-15 | Supervisor không vào được quản lý user | 1. Đăng nhập bằng tài khoản supervisor.<br>2. Truy cập `/admin/users`. | Role: supervisor | Hệ thống chặn truy cập hoặc redirect. | Chưa test |
| TC-16 | Admin vào được quản lý user | 1. Đăng nhập bằng tài khoản admin.<br>2. Truy cập `/admin/users`. | Email: admin.test@cnn.com<br>Password: Admin12345 | Hiển thị danh sách user. | Chưa test |
| TC-17 | Xem danh sách sản phẩm | 1. Vào trang `/shop`.<br>2. Quan sát danh sách sản phẩm. | Database có dữ liệu sản phẩm | Hiển thị danh sách sản phẩm gồm ảnh, tên, giá, rating và số lượng đã bán. | Chưa test |
| TC-18 | Tìm kiếm sản phẩm | 1. Vào trang tìm kiếm hoặc thanh search.<br>2. Nhập từ khóa.<br>3. Bấm tìm kiếm. | Keyword: áo thun | Hiển thị các sản phẩm phù hợp với từ khóa. | Chưa test |
| TC-19 | Lọc sản phẩm theo khoảng giá hợp lệ | 1. Vào `/shop`.<br>2. Nhập giá tối thiểu và tối đa hợp lệ.<br>3. Áp dụng bộ lọc. | Giá tối thiểu: 50000<br>Giá tối đa: 200000 | Danh sách chỉ hiển thị sản phẩm nằm trong khoảng giá. | Chưa test |
| TC-20 | Lọc sản phẩm với khoảng giá sai | 1. Vào `/shop`.<br>2. Nhập giá tối thiểu lớn hơn giá tối đa.<br>3. Áp dụng bộ lọc. | Giá tối thiểu: 300000<br>Giá tối đa: 100000 | Hiển thị thông báo giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa. | Chưa test |
| TC-21 | Xem chi tiết sản phẩm | 1. Vào `/shop`.<br>2. Click vào một sản phẩm. | Product ID hợp lệ | Hiển thị chi tiết sản phẩm, hình ảnh, size, tồn kho, review và sản phẩm tương tự. | Chưa test |
| TC-22 | Thêm sản phẩm vào giỏ hàng thành công | 1. Đăng nhập customer.<br>2. Vào chi tiết sản phẩm.<br>3. Chọn size, số lượng.<br>4. Bấm thêm vào giỏ hàng. | Sản phẩm còn hàng<br>Size: M<br>Số lượng: 1 | Giỏ hàng cập nhật đúng sản phẩm vừa thêm. | Chưa test |
| TC-23 | Thêm sản phẩm vượt tồn kho | 1. Đăng nhập customer.<br>2. Chọn sản phẩm còn ít hàng.<br>3. Nhập số lượng lớn hơn tồn kho.<br>4. Bấm thêm vào giỏ. | Stock: 5<br>Số lượng nhập: 10 | Hiển thị thông báo vượt tồn kho. | Chưa test |
| TC-24 | Cập nhật số lượng trong giỏ hàng | 1. Vào `/cart`.<br>2. Tăng hoặc giảm số lượng sản phẩm. | Số lượng mới: 2 | Số lượng và tổng tiền trong giỏ hàng được cập nhật đúng. | Chưa test |
| TC-25 | Xóa sản phẩm khỏi giỏ hàng | 1. Vào `/cart`.<br>2. Bấm xóa một sản phẩm. | Item ID trong giỏ hàng | Sản phẩm bị xóa khỏi giỏ hàng. | Chưa test |
| TC-26 | Checkout thành công | 1. Đăng nhập customer.<br>2. Có sản phẩm trong giỏ hàng.<br>3. Vào `/checkout`.<br>4. Nhập thông tin giao hàng.<br>5. Bấm thanh toán/tạo đơn. | Họ tên: Nguyễn Văn A<br>SĐT: 0901234567<br>Địa chỉ: 123 Nguyễn Trãi, Hà Nội<br>Phương thức giao hàng: standard<br>Phương thức thanh toán: VNPay | Đơn hàng được tạo thành công, trạng thái "Chờ thanh toán". | Chưa test |
| TC-27 | Checkout thiếu địa chỉ | 1. Vào `/checkout`.<br>2. Bỏ trống địa chỉ.<br>3. Submit checkout. | SĐT: 0901234567<br>Địa chỉ: rỗng | Hiển thị thông báo bắt buộc nhập địa chỉ. | Chưa test |
| TC-28 | Checkout khi giỏ hàng rỗng | 1. Xóa toàn bộ giỏ hàng.<br>2. Vào `/checkout` hoặc submit checkout. | Giỏ hàng rỗng | Hiển thị thông báo giỏ hàng rỗng hoặc không cho checkout. | Chưa test |
| TC-29 | Xem lịch sử đơn hàng | 1. Đăng nhập customer.<br>2. Vào `/orders`. | Customer đã có đơn hàng | Hiển thị danh sách đơn hàng của customer đang đăng nhập. | Chưa test |
| TC-30 | Xem chi tiết đơn hàng | 1. Vào `/orders`.<br>2. Click một đơn hàng. | Order ID hợp lệ của user hiện tại | Hiển thị sản phẩm, tổng tiền, trạng thái, địa chỉ giao hàng. | Chưa test |
| TC-31 | Hủy đơn đang chờ thanh toán | 1. Vào chi tiết đơn hàng trạng thái pending.<br>2. Bấm hủy đơn.<br>3. Xác nhận. | Order status: pending | Đơn chuyển sang cancelled và tồn kho được hoàn lại. | Chưa test |
| TC-32 | Không cho hủy đơn đã thanh toán | 1. Vào chi tiết đơn hàng đã thanh toán.<br>2. Thử bấm hủy đơn. | Order status: paid/completed | Hệ thống không cho hủy đơn. | Chưa test |
| TC-33 | Khởi tạo thanh toán VNPay | 1. Tạo đơn hàng.<br>2. Bấm thanh toán VNPay. | Order ID hợp lệ<br>Payment method: VNPay | Hệ thống trả về payment URL và redirect sang VNPay. | Chưa test |
| TC-34 | Thanh toán VNPay thành công | 1. Trên sandbox VNPay, hoàn tất giao dịch thành công.<br>2. Quay về trang kết quả thanh toán. | Mã phản hồi VNPay: `00` | Đơn hàng chuyển trạng thái thành "Đã thanh toán" và giỏ hàng được xóa. | Chưa test |
| TC-35 | Thanh toán VNPay thất bại hoặc hủy | 1. Tạo giao dịch VNPay.<br>2. Hủy hoặc thanh toán thất bại.<br>3. Quay về trang kết quả. | Mã phản hồi VNPay khác `00` | Trang kết quả hiển thị thanh toán thất bại, đơn vẫn ở trạng thái "Chờ thanh toán". | Chưa test |
| TC-36 | Review sản phẩm sau thanh toán | 1. Đăng nhập customer.<br>2. Mở đơn hàng đã thanh toán.<br>3. Chọn sản phẩm và nhập đánh giá.<br>4. Bấm gửi đánh giá. | Rating: 5<br>Comment: Sản phẩm đẹp | Review được tạo thành công và hiển thị trên chi tiết sản phẩm. | Chưa test |
| TC-37 | Không cho review khi đơn chưa thanh toán | 1. Mở đơn hàng trạng thái pending.<br>2. Thử gửi review. | Order status: pending<br>Rating: 5 | Hệ thống từ chối review. | Chưa test |
| TC-38 | Không cho review trùng | 1. Review một sản phẩm trong một đơn hàng.<br>2. Gửi lại review lần 2 cho cùng sản phẩm và đơn hàng. | Product ID đã review<br>Order ID đã review | Hiển thị thông báo đã đánh giá sản phẩm này. | Chưa test |
| TC-39 | Customer mở phòng chat | 1. Đăng nhập customer.<br>2. Vào `/chat`. | Customer hợp lệ | Hệ thống tạo hoặc lấy phòng chat hiện tại. | Chưa test |
| TC-40 | Customer gửi tin nhắn chat | 1. Vào `/chat`.<br>2. Nhập nội dung tin nhắn.<br>3. Bấm gửi. | Nội dung: Shop còn áo thun nam không? | Tin nhắn hiển thị trong khung chat. | Chưa test |
| TC-41 | Chatbot AI trả lời | 1. Đảm bảo có `DEEPSEEK_API_KEY` trong `server/.env`.<br>2. Customer gửi câu hỏi về sản phẩm/chính sách. | Nội dung: Chính sách đổi trả như thế nào? | AI trả lời bằng tiếng Việt, ngắn gọn và đúng phạm vi hỗ trợ. | Chưa test |
| TC-42 | Chuyển chat sang nhân viên hỗ trợ | 1. Customer gửi câu hỏi ngoài phạm vi hoặc chọn chưa giải quyết.<br>2. Kiểm tra trạng thái phòng chat. | Nội dung: Tôi cần gặp nhân viên hỗ trợ | Phòng chat được chuyển sang trạng thái cần nhân viên hỗ trợ. | Chưa test |
| TC-43 | Staff xem danh sách phòng chat | 1. Đăng nhập staff.<br>2. Vào `/staff/support`. | Role: employee/supervisor/admin | Hiển thị danh sách phòng chat cần hỗ trợ. | Chưa test |
| TC-44 | Staff nhận phòng chat | 1. Vào `/staff/support`.<br>2. Chọn một phòng chat.<br>3. Bấm nhận phòng. | Room ID hợp lệ | Phòng chat được gắn với staff hiện tại. | Chưa test |
| TC-45 | Staff gửi tin nhắn hỗ trợ | 1. Staff mở phòng chat đã nhận.<br>2. Nhập nội dung trả lời.<br>3. Bấm gửi. | Nội dung: Shop sẽ hỗ trợ bạn ngay. | Customer nhận được tin nhắn từ staff. | Chưa test |
| TC-46 | Staff xem danh sách đơn hàng | 1. Đăng nhập staff.<br>2. Vào `/staff/orders`. | Role: employee/supervisor/admin | Hiển thị danh sách đơn hàng. | Chưa test |
| TC-47 | Staff cập nhật trạng thái đơn hàng | 1. Vào `/staff/orders`.<br>2. Chọn một đơn hàng.<br>3. Đổi trạng thái đơn. | Order ID hợp lệ<br>Status mới: completed | Trạng thái đơn hàng được cập nhật đúng. | Chưa test |
| TC-48 | Supervisor cập nhật tồn kho sản phẩm | 1. Đăng nhập supervisor.<br>2. Vào `/staff/products`.<br>3. Chọn sản phẩm và đổi tồn kho. | Product ID hợp lệ<br>Stock mới: 50 | Tồn kho sản phẩm được cập nhật đúng. | Chưa test |
| TC-49 | Admin đổi role user | 1. Đăng nhập admin.<br>2. Vào `/admin/users`.<br>3. Chọn user và đổi role. | User ID hợp lệ<br>Role mới: employee | Role user được cập nhật và quyền thay đổi theo role mới. | Chưa test |
| TC-50 | Admin khóa hoặc mở user | 1. Đăng nhập admin.<br>2. Vào `/admin/users`.<br>3. Toggle trạng thái active của user. | User ID hợp lệ<br>isActive: false/true | Trạng thái tài khoản được cập nhật đúng. | Chưa test |
| TC-51 | Build client thành công | 1. Mở terminal.<br>2. Chạy lệnh build client. | Lệnh: `cd client && npm run build` | Build thành công, không có lỗi compile. | Chưa test |
| TC-52 | Load server app thành công | 1. Mở terminal.<br>2. Chạy lệnh kiểm tra import app. | Lệnh: `cd server && node -e "require('./src/app'); console.log('ok')"` | Terminal in ra `ok`, không lỗi import. | Chưa test |
| TC-53 | Health check API | 1. Chạy server.<br>2. Gọi endpoint health check. | Method: GET<br>URL: `/api/health` | API trả về status `ok`. | Chưa test |
| TC-54 | Import dữ liệu sản phẩm từ CSV | 1. Mở terminal trong thư mục server.<br>2. Chạy lệnh import CSV. | Lệnh: `npm run import:csv` | Import sản phẩm thành công vào database. | Chưa test |
| TC-55 | Tạo tài khoản staff bằng script | 1. Mở terminal trong thư mục server.<br>2. Chạy script tạo user. | Lệnh: `npm run create:user -- --name="Supervisor Test" --email=supervisor@test.com --password=Supervisor12345 --role=supervisor` | Tạo mới hoặc cập nhật tài khoản staff thành công. | Chưa test |
| TC-56 | Floating chat widget hiển thị cho customer | 1. Đăng nhập customer.<br>2. Vào bất kỳ trang nào (trừ `/chat`).<br>3. Quan sát góc dưới phải màn hình. | Role: customer | Hiển thị nút chat tròn có icon bong bóng. Không hiển thị khi ở trang `/chat`. | Chưa test |
| TC-57 | Mở và đóng chat widget | 1. Đăng nhập customer.<br>2. Click nút chat widget.<br>3. Click lại nút X để đóng. | Role: customer | Popup chat mở ra khi click, đóng lại khi click X. Lịch sử chat vẫn giữ nguyên sau khi đóng/mở lại. | Chưa test |
| TC-58 | Quick reply buttons trong chat widget | 1. Đăng nhập customer.<br>2. Mở chat widget lần đầu. | Phòng chat mới hoặc ≤ 2 tin nhắn | Hiển thị 4 nút gợi ý: Kiểm tra đơn hàng, Phí giao hàng, Chính sách đổi trả, Gợi ý sản phẩm. Khi click một nút, tin nhắn được gửi ngay. | Chưa test |
| TC-59 | Bot trả lời streaming từng chữ | 1. Đăng nhập customer.<br>2. Mở chat và gửi tin nhắn bất kỳ. | Nội dung: Phí ship bao nhiêu? | Hiển thị typing indicator (3 chấm nảy) trước khi bot trả lời. Sau đó text xuất hiện từng chữ dần dần, có cursor nhấp nháy. | Chưa test |
| TC-60 | Bot tra cứu đơn hàng của khách | 1. Đăng nhập customer đã có đơn hàng.<br>2. Mở chat widget.<br>3. Gửi câu hỏi về đơn hàng. | Nội dung: "Đơn hàng của tôi đến đâu rồi?" hoặc "Ship chưa vậy?" | Bot trả lời đúng trạng thái đơn hàng gần nhất của khách (ví dụ: "Đang giao"), không bịa. | Chưa test |
| TC-61 | Bot gọi tên khách khi trả lời | 1. Đăng nhập customer có tên đầy đủ.<br>2. Mở chat và gửi tin nhắn. | Tài khoản có trường name được điền | Bot xưng hô bằng tên khách trong câu trả lời (ví dụ: "Chào chị Uyên" thay vì "Chào bạn"). | Chưa test |
| TC-62 | Bot gợi ý sản phẩm dạng chip | 1. Đăng nhập customer.<br>2. Gửi tin nhắn tìm kiếm sản phẩm. | Nội dung: Tôi muốn mua áo thun | Bot trả lời và hiển thị tên sản phẩm dạng chip có icon túi xách, click vào chip dẫn đến trang chi tiết sản phẩm. | Chưa test |
| TC-63 | Input bị disable khi bot đang trả lời | 1. Gửi tin nhắn.<br>2. Ngay khi bot bắt đầu streaming, thử nhập tin nhắn mới. | Bot đang streaming | Ô nhập liệu và nút gửi bị disable. Sau khi bot trả lời xong mới cho nhập tiếp. | Chưa test |
| TC-64 | Chat widget nhận tin realtime không mất kết nối | 1. Mở chat widget.<br>2. Đóng popup (click X).<br>3. Mở lại popup.<br>4. Gửi tin nhắn mới. | Socket đã kết nối | Tin nhắn bot vẫn hiển thị đúng sau khi đóng/mở lại widget. Socket không bị ngắt. | Chưa test |
| TC-65 | Sản phẩm tương tự hiển thị trên trang chi tiết | 1. Vào `/products/:id` bất kỳ.<br>2. Scroll xuống cuối trang. | Product ID hợp lệ, có sản phẩm cùng danh mục trong DB | Section "Sản phẩm tương tự" hiển thị tối đa 12 sản phẩm cùng danh mục. | Chưa test |
| TC-66 | Sản phẩm tương tự ưu tiên tầm giá gần | 1. Vào trang chi tiết sản phẩm giá 100.000đ.<br>2. Quan sát section sản phẩm tương tự. | Sản phẩm có giá 100.000đ | Các sản phẩm gợi ý có giá nằm trong khoảng 50.000đ – 150.000đ được ưu tiên hiển thị trước. | Chưa test |
| TC-67 | Không hiển thị sản phẩm đang xem trong gợi ý tương tự | 1. Vào trang chi tiết sản phẩm bất kỳ.<br>2. Quan sát section sản phẩm tương tự. | Product ID hiện tại | Sản phẩm đang xem không xuất hiện trong danh sách tương tự. | Chưa test |

## Checklist Trước Khi Demo

1. Server chạy không lỗi.
2. Client chạy không lỗi.
3. Database có sản phẩm.
4. Có tài khoản `admin`, `supervisor`, `employee`, `customer`.
5. `DEEPSEEK_API_KEY` đã được cấu hình trong `server/.env`.
6. Demo được đăng nhập và phân quyền.
7. Demo được mua hàng từ sản phẩm đến đơn hàng.
8. Demo được thanh toán hoặc mock thanh toán.
9. Demo được review sản phẩm sau thanh toán.
10. Demo được staff/admin quản lý đơn, sản phẩm, user.
11. Demo chat widget với bot AI (streaming, tra cứu đơn hàng, gợi ý sản phẩm).
12. Demo sản phẩm tương tự trên trang chi tiết sản phẩm.
