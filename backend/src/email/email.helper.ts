import * as nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: nodemailer.SendMailOptions['attachments'];
}

type EmailTransport = {
  transporter: nodemailer.Transporter;
  fromAddress: string;
};

let cachedTransport: EmailTransport | null = null;

function createEmailTransport(): EmailTransport | null {
  const {
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REFRESH_TOKEN,
    GMAIL_USER,
    GMAIL_FROM,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
  } = process.env;

  if (
    GMAIL_CLIENT_ID &&
    GMAIL_CLIENT_SECRET &&
    GMAIL_REFRESH_TOKEN &&
    GMAIL_USER
  ) {
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: GMAIL_USER,
          clientId: GMAIL_CLIENT_ID,
          clientSecret: GMAIL_CLIENT_SECRET,
          refreshToken: GMAIL_REFRESH_TOKEN,
        },
      }),
      fromAddress: GMAIL_FROM || GMAIL_USER,
    };
  }

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    const port = Number(SMTP_PORT);
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error('SMTP_PORT must be a valid positive integer');
    }

    return {
      transporter: nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      }),
      fromAddress: SMTP_FROM || SMTP_USER,
    };
  }

  return null;
}

function getEmailTransport(): EmailTransport | null {
  // Resolve lazily because ConfigModule loads environment variables during
  // NestJS bootstrap, after imported modules have been evaluated.
  if (cachedTransport) return cachedTransport;

  const transport = createEmailTransport();
  if (transport) cachedTransport = transport;

  return transport;
}

export function isEmailConfigured(): boolean {
  return Boolean(getEmailTransport());
}

/**
 * Reusable Nodemailer helper.
 *
 * Gmail OAuth2 is preferred when its credentials are present. Standard SMTP
 * remains available as a fallback for local development or another provider.
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments,
}: SendEmailOptions): Promise<void> {
  if (!to || typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error('A valid recipient email address is required');
  }

  if (!subject.trim()) {
    throw new Error('Email subject is required');
  }

  if (!text && !html) {
    throw new Error('Email must include either text or HTML content');
  }

  const emailTransport = getEmailTransport();
  if (!emailTransport) {
    throw new Error('Email provider is not configured');
  }

  await emailTransport.transporter.sendMail({
    from: emailTransport.fromAddress,
    to,
    subject,
    ...(text ? { text } : {}),
    ...(html ? { html } : {}),
    ...(attachments?.length ? { attachments } : {}),
  });
}

/** Escape untrusted values before interpolating them into HTML email markup. */
export function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}
