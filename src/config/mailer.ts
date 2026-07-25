import nodemailer from "nodemailer";

export const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ORDER_CONFIRMATION_EMAIL,
    pass: process.env.ORDER_CONFIRMATION_PASSWORD,
  },
});


export const MAIL_FROM = `"Monk Scents" <${process.env.ORDER_CONFIRMATION_EMAIL}>`;

export const adminMailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_NODEMAILER_EMAIL,
    pass: process.env.ADMIN_NODEMAILER_PASSWORD,
  },
});

export const ADMIN_MAIL_FROM = `"Monk Scents" <${process.env.ADMIN_NODEMAILER_EMAIL}>`;
