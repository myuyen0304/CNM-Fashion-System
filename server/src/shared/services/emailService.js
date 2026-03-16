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
 * Gửi email xác minh tài khoản
 */
const sendVerificationEmail = async (email, name, token) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;

  await transporter.sendMail({
    from: `"E-commerce Shop" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Xác minh tài khoản của bạn",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Xin chào ${name},</h2>
        <p>Cảm ơn bạn đã đăng ký. Vui lòng nhấn nút bên dưới để xác minh email:</p>
        <a href="${verifyUrl}" 
           style="display: inline-block; padding: 12px 24px; background: #4A90D9; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Xác minh email
        </a>
        <p style="color: #666; font-size: 14px;">Link có hiệu lực trong 24 giờ.</p>
        <p style="color: #666; font-size: 14px;">Nếu bạn không đăng ký, hãy bỏ qua email này.</p>
      </div>
    `,
  });
};

/**
 * Gửi email reset mật khẩu
 */
const sendResetPasswordEmail = async (email, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

  await transporter.sendMail({
    from: `"E-commerce Shop" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Đặt lại mật khẩu",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Đặt lại mật khẩu</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn nút bên dưới:</p>
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 12px 24px; background: #E74C3C; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Đặt lại mật khẩu
        </a>
        <p style="color: #666; font-size: 14px;">Link có hiệu lực trong 15 phút.</p>
        <p style="color: #666; font-size: 14px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendResetPasswordEmail };
