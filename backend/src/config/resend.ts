import { Resend } from 'resend';
import nodemailer from 'nodemailer';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || '';
const isDevelopment = process.env.NODE_ENV !== 'production';
export type SendEmailOptions = (
  { to: string | string[]; subject: string; from?: string; text: string; html?: string }
  | { to: string | string[]; subject: string; from?: string; html: string; text?: string }
);
let resend: Resend | null = null;
if (!isDevelopment && RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}
let etherealTransporter: nodemailer.Transporter | null = null;
async function createEtherealTransporter(): Promise<nodemailer.Transporter> {
  if (etherealTransporter) {
    return etherealTransporter;
  }
  try {
    const testAccount = await nodemailer.createTestAccount();
    etherealTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    console.log('✅ Ethereal Email configurado para desarrollo');
    console.log('📧 Usuario:', testAccount.user);
    console.log('🔑 Contraseña:', testAccount.pass);
    return etherealTransporter;
  } catch (err) {
    console.error('❌ Error creando cuenta de Ethereal:', err);
    throw err;
  }
}
async function sendEmailWithEthereal(options: SendEmailOptions) {
  try {
    const transporter = await createEtherealTransporter();
    const from = options.from || 'Dev Test <dev@test.com>';
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to,
      subject: options.subject,
    };
    if (typeof (options as any).text === 'string') {
      mailOptions.text = (options as any).text;
    }
    if (typeof (options as any).html === 'string') {
      mailOptions.html = (options as any).html;
    }
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('📬 Email enviado (desarrollo)');
      console.log('👀 Preview URL:', previewUrl);
    } else {
      console.log('📬 Email enviado (desarrollo) - ID:', info.messageId);
    }
    return {
      ok: true,
      status: 200,
      data: {
        id: info.messageId,
        previewUrl,
      },
    };
  } catch (err) {
    console.error('❌ Error enviando email con Ethereal:', err);
    return {
      ok: false,
      status: 500,
      error: 'ethereal_send_failed',
    };
  }
}
async function sendEmailWithResend(options: SendEmailOptions) {
  if (!resend) {
    return { ok: false, status: 400, error: 'resend_not_configured' };
  }
  const from = options.from || RESEND_FROM;
  if (!from) {
    return { ok: false, status: 400, error: 'resend_from_missing' };
  }
  try {
    const payload: any = {
      from,
      to: options.to,
      subject: options.subject,
    };
    if (typeof (options as any).text === 'string') payload.text = (options as any).text;
    if (typeof (options as any).html === 'string') payload.html = (options as any).html;
    const { data, error } = await resend.emails.send(payload);
    if (error) {
      console.error('resend_send_error', error);
      return { ok: false, status: 400, error } as any;
    }
    return { ok: true, status: 200, data } as any;
  } catch (err) {
    console.error('resend_sdk_failed', err);
    return { ok: false, status: 500, error: 'resend_sdk_failed' };
  }
}
export async function sendEmail(options: SendEmailOptions) {
  if (isDevelopment) {
    return await sendEmailWithEthereal(options);
  } else {
    return await sendEmailWithResend(options);
  }
}
