import nodemailer from "nodemailer";

export default async function sendOtpEmail(userEmail, otp) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: "Your OTP Code for Account Verification",
    text: `Your OTP code is: ${otp}. This code will expire in 5 minutes.`,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
}
