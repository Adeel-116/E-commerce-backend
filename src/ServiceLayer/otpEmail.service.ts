import { mailTransporter, MAIL_FROM } from "../config/mailer";
import { buildOtpEmail } from "../templates/otpEmail.template";

export async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  const { subject, html } = buildOtpEmail(otp);
  await mailTransporter.sendMail({ from: MAIL_FROM, to: toEmail, subject, html });
}
