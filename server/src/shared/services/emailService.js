const nodemailer = require("nodemailer");

const getEmailConfig = () => {
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;

  return {
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST,
    port,
    secure: port === 465,
    user,
    pass,
    from: process.env.EMAIL_FROM || user,
  };
};

const emailConfig = getEmailConfig();

// Tạo transporter 1 lần, dùng lại
const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass,
  },
});

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

const sendMailWithDebug = async (label, mailOptions) => {
  const info = await transporter.sendMail(mailOptions);
  logMailResult(label, mailOptions, info);
  return info;
};

/**
 * Gửi email OTP xác minh tài khoản
 */
const sendRegistrationOtpEmail = async (email, name, otp, token) => {
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
