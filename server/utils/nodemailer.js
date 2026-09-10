import nodemailer from 'nodemailer';

/**
 * @import {SendMailOptions as MailOptions} from 'nodemailer';
 */

/**
 * Build a nodemailer transporter from the `smtp` runtime config block.
 *
 * The transport is configured from the private runtime config `smtp`,
 * which is populated via the NUXT_SMTP_* environment variables:
 *   NUXT_SMTP_FROM, NUXT_SMTP_HOST, NUXT_SMTP_PORT, NUXT_SMTP_SECURE,
 *   NUXT_SMTP_AUTH_USER, NUXT_SMTP_AUTH_PASS
 *
 * @returns {Promise<import('nodemailer').Transporter>}
 */
const useSmtpTransporter = async () => {
  const { from, host, port, secure, user, pass } = useRuntimeConfig().smtp;

  return nodemailer.createTransport(
    {
      host,
      port: Number(port),
      secure: Boolean(secure),
      auth: user ? { user, pass } : undefined,
    },
    {
      from,
    },
  );
};

/**
 * Send an email using the configured SMTP transport.
 *
 * @param {MailOptions & { from?: string }} options - The mail options. The
 * `from` address defaults to the configured `smtp.from` when not specified.
 * @returns {Promise<import('nodemailer').SentMessageInfo>}
 */
export const sendMail = async (options) => {
  const transporter = await useSmtpTransporter();
  const { from, ...rest } = options;

  return transporter.sendMail({
    from: from || useRuntimeConfig().smtp.from,
    ...rest,
  });
};
