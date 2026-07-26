const { mailTransporter, MAIL_FROM } = require("../config/mailer");
const { buildOtpEmail } = require("../templates/otpEmail.template");

async function sendOtpEmail(toEmail, otp) {
  const { subject, html } = buildOtpEmail(otp);
  await mailTransporter.sendMail({ from: MAIL_FROM, to: toEmail, subject, html });
}

module.exports = { sendOtpEmail };
