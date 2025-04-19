import nodemailer from "nodemailer";

/**
 * Sends an OTP code to the user's email with proper formatting to avoid spam filters
 * @param {string} userEmail - The recipient's email address
 * @param {string} otp - The one-time password to send
 * @returns {Promise<void>}
 */
export default async function sendOtpEmail(userEmail, otp) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    secure: true,
  });

  // Company/app name for branding
  const companyName = process.env.COMPANY_NAME || "Scofist";

  // Create a professional HTML email template
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Code</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { border: 1px solid #e0e0e0; border-radius: 5px; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .code { background-color: #f5f5f5; font-size: 24px; font-weight: bold; text-align: center; padding: 15px; margin: 20px 0; letter-spacing: 5px; border-radius: 4px; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${companyName} Account Verification</h2>
        </div>
        <p>Hello,</p>
        <p>Your verification code for ${companyName} is:</p>
        <div class="code">${otp}</div>
        <p>This code will expire in 5 minutes for security reasons.</p>
        <p>If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.</p>
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: {
      name: companyName,
      address: process.env.EMAIL_USER,
    },
    to: userEmail,
    subject: `${otp} is your verification code`,
    text: `Your verification code is: ${otp}. This code will expire in 5 minutes. If you didn't request this code, please ignore this email.`,
    html: htmlContent,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Importance: "High",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}
