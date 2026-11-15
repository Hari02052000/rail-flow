import * as nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

export interface EmailSender {
  sendOtp(to: string, code: string, expiresInMinutes: number): Promise<void>;
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const createEmailSender = (config: EmailConfig): EmailSender => {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass ?? '' } : undefined,
  });

  return {
    async sendOtp(to: string, code: string, expiresInMinutes: number): Promise<void> {
      await transporter.sendMail({
        from: config.from,
        to,
        subject: 'Your RailFlow verification code',
        text: `Your RailFlow verification code is ${code}. It expires in ${expiresInMinutes} minutes.`,
      });
    },
  };
};
