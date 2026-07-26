const nodemailer = require("nodemailer");

const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ORDER_CONFIRMATION_EMAIL,
    pass: process.env.ORDER_CONFIRMATION_PASSWORD,
  },
});


const MAIL_FROM = `"Monk Scents" <${process.env.ORDER_CONFIRMATION_EMAIL}>`;

const adminMailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_NODEMAILER_EMAIL,
    pass: process.env.ADMIN_NODEMAILER_PASSWORD,
  },
});

const ADMIN_MAIL_FROM = `"Monk Scents" <${process.env.ADMIN_NODEMAILER_EMAIL}>`;

module.exports = {
  mailTransporter,
  MAIL_FROM,
  adminMailTransporter,
  ADMIN_MAIL_FROM,
};
