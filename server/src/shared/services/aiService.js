/**
 * AI Service
 * - extractFeatures: mock image embedding cho image search
 * - cosineSimilarity: tính độ tương đồng vector
 * - claudeChatbotReply: chatbot dùng Google Gemini API
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ========================
// IMAGE SEARCH (mock)
// ========================

/**
 * Trích xuất feature vector từ ảnh (dùng cho image search).
 * TODO: Tích hợp AI thật (Python API / TensorFlow.js / OpenAI CLIP).
 * Mock: trả random vector 128 chiều.
 */
const extractFeatures = async (imageBuffer) => {
  const vector = Array.from({ length: 128 }, () => Math.random());
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / magnitude);
};

/**
 * Tính cosine similarity giữa 2 vector.
 */
const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
};

// ========================
// CHATBOT (Google Gemini API)
// ========================

const SYSTEM_PROMPT = `Bạn là trợ lý AI của cửa hàng thời trang online EShop. Hãy hỗ trợ khách hàng bằng tiếng Việt, thân thiện và ngắn gọn.

THÔNG TIN CỬA HÀNG:
- Tên: EShop — cửa hàng thời trang online
- Danh mục sản phẩm: áo, quần, váy, phụ kiện, giày dép

CHÍNH SÁCH GIAO HÀNG:
- Giao hàng tiêu chuẩn: 3-5 ngày, phí 20.000đ
- Giao hàng nhanh (express): 1-2 ngày, phí 50.000đ
- Miễn phí giao hàng cho đơn từ 500.000đ

CHÍNH SÁCH ĐỔI TRẢ:
- Đổi trả trong vòng 7 ngày kể từ khi nhận hàng
- Sản phẩm phải còn nguyên tem, chưa qua sử dụng
- Liên hệ hotline hoặc email để được hỗ trợ

PHƯƠNG THỨC THANH TOÁN:
- VNPay (thẻ ATM nội địa, visa, mastercard)
- MoMo
- PayPal

TRẠNG THÁI ĐƠN HÀNG:
- "Chờ thanh toán" → "Đã thanh toán" → "Đang giao" → "Hoàn tất"
- Có thể hủy đơn khi ở trạng thái "Chờ thanh toán"

LIÊN HỆ HỖ TRỢ:
- Hotline: 1900-xxxx (8:00–22:00 mỗi ngày)
- Email: support@eshop.vn

QUY TẮC TRẢ LỜI:
1. Trả lời bằng tiếng Việt, thân thiện và ngắn gọn (tối đa 3-4 câu)
2. Nếu khách hỏi về sản phẩm cụ thể và bạn được cung cấp danh sách sản phẩm, hãy gợi ý sản phẩm phù hợp theo định dạng: [[Tên sản phẩm|productId]]
3. Không bịa thông tin không có trong context
4. Nếu câu hỏi nằm ngoài phạm vi hỗ trợ (khiếu nại phức tạp, tranh chấp, vấn đề kỹ thuật hệ thống), hãy chỉ trả lời đúng 1 từ: ESCALATE_TO_ADMIN`;

/**
 * Chatbot thông minh dùng Google Gemini API.
 * @param {string} message - Tin nhắn của khách hàng
 * @param {Array} history - Lịch sử tin nhắn [{senderRole, content}]
 * @param {Array} productContext - Danh sách sản phẩm liên quan [{_id, name, price, category, avgRating, stock}]
 * @returns {string|null} - Câu trả lời hoặc null (cần chuyển admin)
 */
const claudeChatbotReply = async (message, history = [], productContext = []) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  // Build history theo định dạng Gemini: role "user" hoặc "model"
  const geminiHistory = [];
  for (const msg of history) {
    if (msg.senderRole === "customer") {
      geminiHistory.push({ role: "user", parts: [{ text: msg.content }] });
    } else if (msg.senderRole === "bot" || msg.senderRole === "admin") {
      geminiHistory.push({ role: "model", parts: [{ text: msg.content }] });
    }
  }

  // Loại bỏ consecutive same role và đảm bảo bắt đầu bằng user
  const validHistory = [];
  let lastRole = null;
  for (const msg of geminiHistory) {
    if (msg.role !== lastRole) {
      validHistory.push(msg);
      lastRole = msg.role;
    }
  }
  if (validHistory.length > 0 && validHistory[0].role === "model") {
    validHistory.shift();
  }

  // Build user message cuối (có thể kèm product context)
  let userContent = message;
  if (productContext.length > 0) {
    const productList = productContext
      .map(
        (p) =>
          `- ID: ${p._id} | Tên: ${p.name} | Giá: ${p.price.toLocaleString("vi-VN")}đ | Danh mục: ${p.category} | Đánh giá: ${p.avgRating || 0}/5 | Còn hàng: ${p.stock > 0 ? "Có" : "Hết"}`,
      )
      .join("\n");
    userContent = `${message}\n\n[Danh sách sản phẩm liên quan từ hệ thống:]\n${productList}`;
  }

  const chat = model.startChat({ history: validHistory });
  const result = await chat.sendMessage(userContent);
  const replyText = result.response.text().trim();

  // Nếu bot yêu cầu escalate → trả null để chuyển admin
  if (!replyText || replyText === "ESCALATE_TO_ADMIN") {
    return null;
  }

  return replyText;
};

module.exports = { extractFeatures, cosineSimilarity, claudeChatbotReply };
