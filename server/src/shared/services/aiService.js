const OpenAI = require("openai");

let deepseekClient;

const getDeepSeekClient = () => {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is required for chatbot responses.");
  }

  if (!deepseekClient) {
    deepseekClient = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
    });
  }

  return deepseekClient;
};

const MODEL = "deepseek-chat";

const SYSTEM_PROMPT = `Bạn là trợ lý AI của cửa hàng thời trang online EShop. Hỗ trợ khách hàng bằng tiếng Việt, thân thiện và ngắn gọn.

THÔNG TIN CỬA HÀNG:
- Tên: EShop — cửa hàng thời trang online
- Danh mục: áo, quần, váy, đầm, giày dép, phụ kiện

CHÍNH SÁCH GIAO HÀNG:
- Giao hàng tiêu chuẩn: 3-5 ngày, phí 20.000đ
- Giao hàng nhanh (express): 1-2 ngày, phí 50.000đ
- Miễn phí giao hàng cho đơn từ 500.000đ

CHÍNH SÁCH ĐỔI TRẢ:
- Đổi trả trong vòng 7 ngày kể từ khi nhận hàng
- Sản phẩm phải còn nguyên tem, chưa qua sử dụng
- Liên hệ hotline hoặc email để được hỗ trợ

PHƯƠNG THỨC THANH TOÁN:
- VNPay (thẻ ATM nội địa, Visa, Mastercard)
- MoMo
- PayPal

TRẠNG THÁI ĐƠN HÀNG:
- "Chờ thanh toán" → "Đã thanh toán" → "Đang giao" → "Hoàn tất"
- Có thể hủy đơn khi ở trạng thái "Chờ thanh toán"
- Không thể hủy khi đơn đang giao hoặc đã hoàn tất

LIÊN HỆ HỖ TRỢ:
- Hotline: 1900-xxxx (8:00–22:00 mỗi ngày)
- Email: support@eshop.vn

QUY TẮC TRẢ LỜI:
1. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn (tối đa 3-4 câu).
2. Khi được cung cấp danh sách sản phẩm, gợi ý sản phẩm phù hợp theo đúng định dạng: [[Tên sản phẩm|productId]] (không thay đổi định dạng này, dùng đúng productId từ danh sách).
3. Khi được cung cấp thông tin đơn hàng của khách, hãy trả lời dựa trên dữ liệu đó — không bịa thêm thông tin.
4. Không bịa thông tin không có trong context.
5. Nếu câu hỏi nằm ngoài phạm vi hỗ trợ (khiếu nại phức tạp, tranh chấp, vấn đề kỹ thuật hệ thống), chỉ trả lời đúng 1 từ: ESCALATE_TO_ADMIN`;

const ESCALATE_SENTINEL = "ESCALATE_TO_ADMIN";

const buildMessages = (message, history, productContext, orderContext, customerName) => {
  const systemContent = customerName
    ? `${SYSTEM_PROMPT}\n\nKhách hàng đang chat tên là: ${customerName}. Hãy gọi tên khách khi phù hợp để thân thiện hơn.`
    : SYSTEM_PROMPT;
  const messages = [{ role: "system", content: systemContent }];

  for (const msg of history) {
    if (msg.senderRole === "customer") {
      messages.push({ role: "user", content: msg.content });
    } else if (msg.senderRole === "bot" || msg.senderRole === "admin") {
      messages.push({ role: "assistant", content: msg.content });
    }
  }

  let userContent = message;

  if (productContext.length > 0) {
    const productList = productContext
      .map(
        (p) =>
          `- ID: ${p._id} | Tên: ${p.name} | Giá: ${p.price?.toLocaleString("vi-VN") ?? 0}đ | Danh mục: ${p.category} | Đánh giá: ${p.avgRating || 0}/5 | Còn hàng: ${(p.stock ?? 1) > 0 ? "Có" : "Hết"}`,
      )
      .join("\n");
    userContent += `\n\n[Danh sách sản phẩm liên quan từ hệ thống:]\n${productList}`;
  }

  if (orderContext.length > 0) {
    const orderList = orderContext
      .map((o) => {
        const items = (o.items || [])
          .map((i) => `${i.name} x${i.quantity} (${(i.unitPrice || 0).toLocaleString("vi-VN")}đ)`)
          .join(", ");
        const date = o.createdAt
          ? new Date(o.createdAt).toLocaleDateString("vi-VN")
          : "N/A";
        return `- Mã đơn: ${o._id} | Ngày: ${date} | Trạng thái: ${o.status} | Tổng tiền: ${(o.totalAmount || 0).toLocaleString("vi-VN")}đ | Sản phẩm: ${items || "N/A"}`;
      })
      .join("\n");
    userContent += `\n\n[Thông tin đơn hàng gần đây của khách:]\n${orderList}`;
  }

  messages.push({ role: "user", content: userContent });
  return messages;
};

/**
 * Chatbot reply (non-streaming, giữ lại để dùng khi cần).
 */
const claudeChatbotReply = async (message, history = [], productContext = [], orderContext = [], customerName = "") => {
  const messages = buildMessages(message, history, productContext, orderContext, customerName);

  const completion = await getDeepSeekClient().chat.completions.create({
    model: MODEL,
    messages,
  });

  const replyText = completion.choices[0]?.message?.content?.trim() ?? "";

  if (!replyText || replyText.includes(ESCALATE_SENTINEL)) {
    return null;
  }
  return replyText;
};

/**
 * Chatbot reply (streaming).
 * @param {string} message
 * @param {Array} history - [{senderRole, content}]
 * @param {Array} productContext
 * @param {Array} orderContext
 * @param {Function} onChunk - gọi với mỗi text chunk
 * @param {Function} onDone - gọi với full text khi xong (null = escalate)
 */
const claudeChatbotReplyStream = async (
  message,
  history = [],
  productContext = [],
  orderContext = [],
  onChunk,
  onDone,
  customerName = "",
) => {
  const messages = buildMessages(message, history, productContext, orderContext, customerName);

  const stream = await getDeepSeekClient().chat.completions.create({
    model: MODEL,
    messages,
    stream: true,
  });

  let fullText = "";
  let buffer = "";
  let escalateDecided = false;

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (!text) continue;

    if (!escalateDecided) {
      buffer += text;
      if (buffer.length >= ESCALATE_SENTINEL.length + 5 || buffer.includes("ESCALATE")) {
        escalateDecided = true;
        if (buffer.startsWith("ESCALATE") || buffer.includes(ESCALATE_SENTINEL)) {
          await onDone(null);
          return;
        }
        fullText += buffer;
        onChunk(buffer);
        buffer = "";
      }
    } else {
      fullText += text;
      onChunk(text);
    }
  }

  // Flush buffer nếu response quá ngắn
  if (!escalateDecided) {
    if (buffer.startsWith("ESCALATE") || buffer.includes(ESCALATE_SENTINEL)) {
      await onDone(null);
      return;
    }
    if (buffer) {
      fullText += buffer;
      onChunk(buffer);
    }
  }

  await onDone(fullText.trim() || null);
};

module.exports = { claudeChatbotReply, claudeChatbotReplyStream };
