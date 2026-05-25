const PRODUCT_INTENT_KEYWORDS = [
  "mua",
  "tim",
  "tim kiem",
  "goi y",
  "gioi thieu",
  "can",
  "muon",
  "san pham",
  "ao",
  "quan",
  "vay",
  "dam",
  "giay",
  "dep",
  "tui",
  "phu kien",
  "loai",
  "co ban",
  "ban khong",
  "con khong",
  "gia",
  "re",
  "sale",
  "khuyen mai",
  "size",
];

const RESOLVED_KEYWORDS = [
  "da giai quyet",
  "ok",
  "on",
  "cam on",
  "yes",
  "roi",
];

const CONTINUE_KEYWORDS = [
  "chua",
  "chua giai quyet",
  "hoi tiep",
  "them",
  "no",
  "khong",
];

const GUEST_LOGIN_REQUIRED_KEYWORDS = [
  "kiem tra don hang",
  "don hang cua toi",
  "don cua toi",
  "trang thai don",
  "ma don",
  "lich su don",
  "lich su mua",
  "huy don",
  "doi tra don",
  "tra hang cua toi",
  "hoan tien",
  "tai khoan",
  "thong tin ca nhan",
  "dia chi giao hang",
  "so dien thoai",
  "thanh toan cua toi",
  "cap nhat tai khoan",
];

const STOP_WORDS = [
  "toi",
  "minh",
  "ban",
  "oi",
  "nhe",
  "khong",
  "co",
  "va",
  "voi",
  "cho",
  "cua",
  "duoc",
  "mot",
  "nhung",
  "cac",
  "la",
  "o",
  "thi",
  "mua",
  "tim",
  "can",
  "muon",
  "goi",
  "y",
  "gioi",
  "thieu",
];

const normalizeChatText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const includesAnyKeyword = (message, keywords) => {
  const normalized = normalizeChatText(message);
  return keywords.some((keyword) => normalized.includes(keyword));
};

const isProductRelated = (message) =>
  includesAnyKeyword(message, PRODUCT_INTENT_KEYWORDS);

const extractProductKeyword = (message) => {
  const normalized = normalizeChatText(message);
  const words = normalized
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.includes(word));

  return words.slice(0, 4).join(" ") || normalized.slice(0, 30);
};

const isResolvedResponse = (message) =>
  includesAnyKeyword(message, RESOLVED_KEYWORDS);

const isContinueResponse = (message) =>
  includesAnyKeyword(message, CONTINUE_KEYWORDS);

const guestIntentRequiresLogin = (message) =>
  includesAnyKeyword(message, GUEST_LOGIN_REQUIRED_KEYWORDS);

module.exports = {
  normalizeChatText,
  isProductRelated,
  extractProductKeyword,
  isResolvedResponse,
  isContinueResponse,
  guestIntentRequiresLogin,
};
