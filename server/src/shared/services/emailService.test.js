const test = require("node:test");
const assert = require("node:assert/strict");

const emailServicePath = require.resolve("./emailService");

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
};

test("sendRegistrationOtpEmail sends real mail through Gmail API provider", async (t) => {
  const originalEnv = {
    CLIENT_URL: process.env.CLIENT_URL,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_SEND_TIMEOUT_MS: process.env.EMAIL_SEND_TIMEOUT_MS,
    GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
  };
  const originalFetch = global.fetch;
  const fetchCalls = [];

  process.env.CLIENT_URL = "https://client.example.com";
  process.env.EMAIL_FROM = "sender@example.com";
  process.env.EMAIL_PROVIDER = "gmail-api";
  process.env.EMAIL_SEND_TIMEOUT_MS = "1000";
  process.env.GMAIL_CLIENT_ID = "gmail-client-id";
  process.env.GMAIL_CLIENT_SECRET = "gmail-client-secret";
  process.env.GMAIL_REFRESH_TOKEN = "gmail-refresh-token";
  process.env.NODE_ENV = "test";

  global.fetch = async (url, options) => {
    fetchCalls.push({ url, options });

    if (url === "https://oauth2.googleapis.com/token") {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ access_token: "access-token" }),
      };
    }

    if (
      url === "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    ) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: "gmail-message-id" }),
      };
    }

    throw new Error(`Unexpected fetch url: ${url}`);
  };

  delete require.cache[emailServicePath];
  const emailService = require(emailServicePath);

  t.after(() => {
    delete require.cache[emailServicePath];
    global.fetch = originalFetch;

    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  await emailService.sendRegistrationOtpEmail(
    "recipient@example.com",
    "Nguyen Van A",
    "123456",
    "verify-token",
  );

  assert.equal(fetchCalls.length, 2);
  assert.equal(fetchCalls[0].url, "https://oauth2.googleapis.com/token");
  assert.equal(
    fetchCalls[1].url,
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
  );
  assert.equal(
    fetchCalls[1].options.headers.Authorization,
    "Bearer access-token",
  );

  const sendBody = JSON.parse(fetchCalls[1].options.body);
  const rawEmail = decodeBase64Url(sendBody.raw);
  assert.match(rawEmail, /From: "E-commerce Shop" <sender@example\.com>/);
  assert.match(rawEmail, /To: recipient@example\.com/);
  assert.match(rawEmail, /123456/);
  assert.match(
    rawEmail,
    /https:\/\/client\.example\.com\/verify-email\/verify-token/,
  );
});

test("sendRegistrationOtpEmail sends real mail through Resend provider", async (t) => {
  const originalEnv = {
    CLIENT_URL: process.env.CLIENT_URL,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_SEND_TIMEOUT_MS: process.env.EMAIL_SEND_TIMEOUT_MS,
    NODE_ENV: process.env.NODE_ENV,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  };
  const originalFetch = global.fetch;
  const fetchCalls = [];

  process.env.CLIENT_URL = "https://client.example.com";
  process.env.EMAIL_FROM = "CNM Fashion <onboarding@resend.dev>";
  process.env.EMAIL_PROVIDER = "resend";
  process.env.EMAIL_SEND_TIMEOUT_MS = "1000";
  process.env.NODE_ENV = "test";
  process.env.RESEND_API_KEY = "re_test_key";

  global.fetch = async (url, options) => {
    fetchCalls.push({ url, options });

    if (url === "https://api.resend.com/emails") {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: "resend-message-id" }),
      };
    }

    throw new Error(`Unexpected fetch url: ${url}`);
  };

  delete require.cache[emailServicePath];
  const emailService = require(emailServicePath);

  t.after(() => {
    delete require.cache[emailServicePath];
    global.fetch = originalFetch;

    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  await emailService.sendRegistrationOtpEmail(
    "recipient@example.com",
    "Nguyen Van A",
    "654321",
    "verify-token",
  );

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, "https://api.resend.com/emails");
  assert.equal(
    fetchCalls[0].options.headers.Authorization,
    "Bearer re_test_key",
  );
  assert.equal(
    fetchCalls[0].options.headers["User-Agent"],
    "cnm-fashion-system/1.0",
  );

  const sendBody = JSON.parse(fetchCalls[0].options.body);
  assert.equal(sendBody.from, "CNM Fashion <onboarding@resend.dev>");
  assert.deepEqual(sendBody.to, ["recipient@example.com"]);
  assert.equal(sendBody.subject, "OTP xác thực tài khoản");
  assert.match(sendBody.html, /654321/);
  assert.match(
    sendBody.html,
    /https:\/\/client\.example\.com\/verify-email\/verify-token/,
  );
});
