import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let transporter: Transporter | null = null;

if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  } catch (err) {
    console.warn('[email] Failed to initialize nodemailer transporter:', err);
  }
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  if (!transporter) {
    console.info(`[email:mock] To: ${to} | Subject: ${subject}`);
    return false;
  }
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM || 'ASPIER <no-reply@aspier.org>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    });
    return true;
  } catch (error) {
    console.error(`[email:error] Failed to send email to ${to}:`, error);
    return false;
  }
}
