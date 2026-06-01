const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeChatText,
  isProductRelated,
  extractProductKeyword,
  guestIntentRequiresLogin,
} = require("./chat.utils");

test("normalizeChatText removes accents and punctuation", () => {
  assert.equal(normalizeChatText("  Đơn hàng của tôi?! "), "don hang cua toi");
});

test("isProductRelated recognizes product shopping intents", () => {
  assert.equal(isProductRelated("Gợi ý cho mình một váy đi tiệc"), true);
  assert.equal(isProductRelated("Kiểm tra đơn hàng của tôi"), false);
});

test("extractProductKeyword removes common filler words", () => {
  assert.equal(extractProductKeyword("Mình muốn tìm áo khoác nữ"), "ao khoac nu");
});

test("guestIntentRequiresLogin flags private order and account flows", () => {
  assert.equal(guestIntentRequiresLogin("Kiểm tra đơn hàng của tôi"), true);
  assert.equal(guestIntentRequiresLogin("Chính sách đổi trả như thế nào"), false);
});
