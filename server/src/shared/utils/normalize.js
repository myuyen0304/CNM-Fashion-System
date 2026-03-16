/**
 * Chuẩn hóa keyword tìm kiếm:
 * - Trim khoảng trắng
 * - Lowercase
 * - Bỏ dấu tiếng Việt (để match không dấu)
 */
const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

const normalizeKeyword = (keyword) => {
  if (!keyword) return "";
  return removeVietnameseTones(keyword.trim().toLowerCase());
};

/**
 * Escape regex special characters trong search string
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

module.exports = { normalizeKeyword, removeVietnameseTones, escapeRegex };
