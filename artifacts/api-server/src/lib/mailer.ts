import nodemailer from "nodemailer";

// Shared mail transporter — reused by feedback, magic links, and any
// future email-sending feature. Single place to configure credentials.
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "info.breakbuddy@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  await transporter.sendMail({
    from: '"Break Buddy" <info.breakbuddy@gmail.com>',
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}
