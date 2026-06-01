export const ORDER_STATUS_LABELS = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  completed: "Đã thanh toán",
  shipping: "Đang giao",
  delivered: "Hoàn tất",
  cancelled: "Hủy",
};

export const normalizeOrderStatus = (status) => {
  const raw = String(status || "").trim();
  if (!raw) return "";

  const normalizedText = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đð]/g, "d")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const compact = normalizedText.replace(/\s+/g, "");

  if (
    compact === "pending" ||
    compact.includes("chothanhtoan") ||
    compact.includes("chuathanhtoan") ||
    compact.includes("chthanhtoan")
  ) {
    return "pending";
  }

  if (
    compact === "paid" ||
    compact === "completed" ||
    compact.includes("dathanhtoan")
  ) {
    return "paid";
  }

  if (
    compact === "shipping" ||
    compact.includes("danggiao") ||
    compact.includes("dangiao")
  ) {
    return "shipping";
  }

  if (
    compact === "delivered" ||
    compact.includes("hoantat") ||
    compact === "hoantt" ||
    compact.startsWith("hoant")
  ) {
    return "delivered";
  }

  if (
    compact === "cancelled" ||
    compact === "canceled" ||
    compact.includes("huy") ||
    compact === "hy" ||
    compact.endsWith("hy")
  ) {
    return "cancelled";
  }

  return raw;
};

export const getOrderDisplayStatus = (status) => {
  const normalized = normalizeOrderStatus(status);
  return ORDER_STATUS_LABELS[normalized] || status || "N/A";
};
