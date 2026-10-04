import nodemailer, { type Transporter } from 'nodemailer';

import { config, emailConfig } from '../config';

import { logger } from './logger';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

let transporter: Transporter | null = null;

/**
 * Sends a plain-text email through the configured SMTP server.
 *
 * Without SMTP settings the message is not sent: in development and test it is logged so the
 * flow can be exercised locally; in production that situation is an error, because silently
 * dropping a password-reset email would lock users out.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!emailConfig.host) {
    if (config.NODE_ENV === 'production') {
      throw new Error('SMTP is not configured (SMTP_HOST is unset)');
    }
    logger.info('Email not sent (SMTP not configured)', {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return;
  }
  transporter ??= nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port ?? 587,
    secure: emailConfig.secure,
    ...(emailConfig.auth ? { auth: emailConfig.auth } : {}),
  });
  await transporter.sendMail({ from: emailConfig.from, ...message });
}
