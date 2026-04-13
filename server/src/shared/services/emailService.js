const nodemailer = require("nodemailer");

// Tạo transporter 1 lần, dùng lại
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true cho port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Gửi email OTP xác minh tài khoản
 */
const sendRegistrationOtpEmail = async (email, name, otp, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;

  await transporter.sendMail({
    from: `"E-commerce Shop" <${process.env.SMTP_USER}>`,
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
  await transporter.sendMail({
    from: `"E-commerce Shop" <${process.env.SMTP_USER}>`,
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
