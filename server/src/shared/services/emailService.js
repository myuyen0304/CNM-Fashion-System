const nodemailer = require("nodemailer");

const DEFAULT_EMAIL_SEND_TIMEOUT_MS = 8000;
const SMTP_REQUIRED_EMAIL_CONFIG_KEYS = [
  "host",
  "port",
  "user",
  "pass",
  "from",
];
const GMAIL_API_REQUIRED_EMAIL_CONFIG_KEYS = [
  "gmailClientId",
  "gmailClientSecret",
  "gmailRefreshToken",
  "from",
];
const EMAIL_PROVIDERS = {
  SMTP: "smtp",
  GMAIL_API: "gmail-api",
};
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

const getEmailSendTimeoutMs = () => {
  const value = Number(process.env.EMAIL_SEND_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_EMAIL_SEND_TIMEOUT_MS;
};

const normalizeEmailProvider = () => {
  const provider = String(process.env.EMAIL_PROVIDER || "")
    .trim()
    .toLowerCase();

  if (provider) {
    return provider;
  }

  return process.env.GMAIL_REFRESH_TOKEN
    ? EMAIL_PROVIDERS.GMAIL_API
    : EMAIL_PROVIDERS.SMTP;
};

const getEmailConfig = () => {
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
  const timeoutMs = getEmailSendTimeoutMs();

  return {
    provider: normalizeEmailProvider(),
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST,
    port,
    secure: port === 465,
    user,
    pass,
    from: process.env.EMAIL_FROM || user,
    gmailClientId: process.env.GMAIL_CLIENT_ID,
    gmailClientSecret: process.env.GMAIL_CLIENT_SECRET,
    gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN,
    timeoutMs,
  };
};

const getRequiredEmailConfigKeys = (emailConfig) => {
  if (emailConfig.provider === EMAIL_PROVIDERS.SMTP) {
    return SMTP_REQUIRED_EMAIL_CONFIG_KEYS;
  }

  if (emailConfig.provider === EMAIL_PROVIDERS.GMAIL_API) {
    return GMAIL_API_REQUIRED_EMAIL_CONFIG_KEYS;
  }

  const error = new Error(
    `EMAIL_PROVIDER không được hỗ trợ: ${emailConfig.provider}.`,
  );
  error.code = "EMAIL_PROVIDER_UNSUPPORTED";
  throw error;
};

const getMissingEmailConfigKeys = (emailConfig) => {
  return getRequiredEmailConfigKeys(emailConfig).filter((key) => {
    const value = emailConfig[key];
    return value === undefined || value === null || String(value).trim() === "";
  });
};

const assertEmailConfig = (emailConfig) => {
  const missingKeys = getMissingEmailConfigKeys(emailConfig);
  const providerLabel =
    emailConfig.provider === EMAIL_PROVIDERS.GMAIL_API ? "Gmail API" : "SMTP";

  if (!process.env.CLIENT_URL) {
    missingKeys.push("CLIENT_URL");
  }

  if (missingKeys.length > 0) {
    const error = new Error(
      `Thiếu cấu hình ${providerLabel}: ${missingKeys.join(", ")}.`,
    );
    error.code = "EMAIL_CONFIG_MISSING";
    throw error;
  }
};

const logEmailFailure = (label, err) => {
  console.error(
    `[Email:${label}] failed code=${err.code || "n/a"} command=${
      err.command || "n/a"
    } responseCode=${err.responseCode || "n/a"} message=${err.message}`,
  );
};

const createTimeoutError = (label, timeoutMs) => {
  const error = new Error(
    `Gửi email ${label} quá ${timeoutMs}ms. Vui lòng kiểm tra cấu hình email.`,
  );
  error.code = "EMAIL_SEND_TIMEOUT";
  return error;
};

const createSmtpTransporter = (emailConfig) => {
  assertEmailConfig(emailConfig);

  return nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    connectionTimeout: emailConfig.timeoutMs,
    greetingTimeout: emailConfig.timeoutMs,
    socketTimeout: emailConfig.timeoutMs,
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass,
    },
  });
};

let transporter;
let transporterConfigKey;

const getTransporter = () => {
  const emailConfig = getEmailConfig();
  assertEmailConfig(emailConfig);

  if (emailConfig.provider !== EMAIL_PROVIDERS.SMTP) {
    return { emailConfig, transporter: null };
  }

  const configKey = [
    emailConfig.host,
    emailConfig.port,
    emailConfig.secure,
    emailConfig.user,
    emailConfig.from,
    emailConfig.timeoutMs,
  ].join("|");

  if (!transporter || transporterConfigKey !== configKey) {
    transporter = createSmtpTransporter(emailConfig);
    transporterConfigKey = configKey;
  }

  return { emailConfig, transporter };
};

const logMailResult = (label, mailOptions, info) => {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(
    `[Email:${label}] accepted=${JSON.stringify(info.accepted || [])} rejected=${JSON.stringify(info.rejected || [])} pending=${JSON.stringify(info.pending || [])}`,
  );
  console.info(
    `[Email:${label}] to=${mailOptions.to} messageId=${info.messageId || "n/a"} response=${info.response || "n/a"}`,
  );

  if (info.envelope) {
    console.info(`[Email:${label}] envelope=${JSON.stringify(info.envelope)}`);
  }
};

const sendSmtpMailWithTimeout = async (label, mailOptions, smtpTransporter) => {
  const timeoutMs = getEmailSendTimeoutMs();
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createTimeoutError(label, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      smtpTransporter.sendMail(mailOptions),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const encodeBase64Url = (value) => {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const encodeMimeHeader = (value) => {
  return `=?UTF-8?B?${Buffer.from(String(value), "utf8").toString("base64")}?=`;
};

const sanitizeHeaderValue = (value) => {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .trim();
};

const createRawEmail = (mailOptions) => {
  return [
    `From: ${sanitizeHeaderValue(mailOptions.from)}`,
    `To: ${sanitizeHeaderValue(mailOptions.to)}`,
    `Subject: ${encodeMimeHeader(mailOptions.subject || "")}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    String(mailOptions.html || mailOptions.text || ""),
  ].join("\r\n");
};

const fetchJsonWithTimeout = async (url, options, timeoutMs, label) => {
  if (typeof fetch !== "function") {
    const error = new Error("Node runtime không hỗ trợ fetch để gọi Gmail API.");
    error.code = "EMAIL_FETCH_UNAVAILABLE";
    throw error;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const text = await response.text();
    let body = {};

    try {
      body = text ? JSON.parse(text) : {};
    } catch (_err) {
      body = { raw: text };
    }

    if (!response.ok) {
      const message =
        body.error_description ||
        body.error?.message ||
        body.error ||
        body.raw ||
        "Gmail API request failed";
      const error = new Error(String(message));
      error.code = "GMAIL_API_REQUEST_FAILED";
      error.responseCode = response.status;
      throw error;
    }

    return body;
  } catch (err) {
    if (err.name === "AbortError") {
      throw createTimeoutError(label, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

const getGmailAccessToken = async (emailConfig) => {
  const body = new URLSearchParams({
    client_id: emailConfig.gmailClientId,
    client_secret: emailConfig.gmailClientSecret,
    refresh_token: emailConfig.gmailRefreshToken,
    grant_type: "refresh_token",
  });

  const data = await fetchJsonWithTimeout(
    GMAIL_TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
    emailConfig.timeoutMs,
    "gmail-token",
  );

  if (!data.access_token) {
    const error = new Error("Gmail API không trả access_token.");
    error.code = "GMAIL_API_TOKEN_MISSING";
    throw error;
  }

  return data.access_token;
};

const sendGmailApiMailWithTimeout = async (
  label,
  mailOptions,
  emailConfig,
) => {
  const accessToken = await getGmailAccessToken(emailConfig);
  const raw = encodeBase64Url(createRawEmail(mailOptions));
  const data = await fetchJsonWithTimeout(
    GMAIL_SEND_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
    emailConfig.timeoutMs,
    label,
  );

  return {
    accepted: [mailOptions.to],
    rejected: [],
    pending: [],
    messageId: data.id,
    response: `gmail-api:${data.id || "sent"}`,
  };
};

const sendMailWithTimeout = async (label, mailOptions) => {
  const { emailConfig, transporter: smtpTransporter } = getTransporter();

  if (emailConfig.provider === EMAIL_PROVIDERS.GMAIL_API) {
    return sendGmailApiMailWithTimeout(label, mailOptions, emailConfig);
  }

  return sendSmtpMailWithTimeout(label, mailOptions, smtpTransporter);
};

const sendMailWithDebug = async (label, mailOptions) => {
  if (process.env.NODE_ENV === "development") {
    try {
      const info = await sendMailWithTimeout(label, mailOptions);
      logMailResult(label, mailOptions, info);
      return info;
    } catch (err) {
      console.warn(`[Email:${label}] Skipped (dev) — ${err.message}`);
      return null;
    }
  }

  try {
    const info = await sendMailWithTimeout(label, mailOptions);
    logMailResult(label, mailOptions, info);
    return info;
  } catch (err) {
    logEmailFailure(label, err);
    throw err;
  }
};

/**
 * Gửi email OTP xác minh tài khoản
 */
const sendRegistrationOtpEmail = async (email, name, otp, token) => {
  const emailConfig = getEmailConfig();
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;

  await sendMailWithDebug("register-otp", {
    from: `"E-commerce Shop" <${emailConfig.from}>`,
    to: email,
    subject: "OTP xác thực tài khoản",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Xin chào ${name},</h2>
        <p>Cảm ơn bạn đã đăng ký. Đây là mã OTP để xác thực tài khoản:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 16px; margin: 16px 0; text-align: center; background: #F3F7FB; border-radius: 8px; color: #1F2937;">
          ${otp}
        </div>
        <p>Nếu bạn muốn xác thực nhanh hơn, có thể bấm nút bên dưới:</p>
        <a href="${verifyUrl}" 
           style="display: inline-block; padding: 12px 24px; background: #4A90D9; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Xác minh email
        </a>
        <p style="color: #666; font-size: 14px;">OTP có hiệu lực trong ${process.env.OTP_EXPIRES_MINUTES || 10} phút.</p>
        <p style="color: #666; font-size: 14px;">Link có hiệu lực trong 24 giờ.</p>
        <p style="color: #666; font-size: 14px;">Nếu bạn không đăng ký, hãy bỏ qua email này.</p>
      </div>
    `,
  });
};

/**
 * Gửi email OTP đặt lại mật khẩu
 */
const sendResetPasswordOtpEmail = async (email, name, otp) => {
  const emailConfig = getEmailConfig();

  await sendMailWithDebug("reset-password-otp", {
    from: `"E-commerce Shop" <${emailConfig.from}>`,
    to: email,
    subject: "OTP đặt lại mật khẩu",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Xin chào ${name || "bạn"},</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Đây là mã OTP của bạn:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 16px; margin: 16px 0; text-align: center; background: #FEF2F2; border-radius: 8px; color: #991B1B;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 14px;">OTP có hiệu lực trong ${process.env.OTP_EXPIRES_MINUTES || 10} phút.</p>
        <p style="color: #666; font-size: 14px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `,
  });
};

module.exports = { sendRegistrationOtpEmail, sendResetPasswordOtpEmail };
