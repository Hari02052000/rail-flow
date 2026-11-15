import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmailSender, normalizeEmail } from '../src/utils/email.js';

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({ sendMail })),
}));

describe('createEmailSender', () => {
  beforeEach(() => {
    sendMail.mockReset();
  });

  it('normalizes email addresses', () => {
    expect(normalizeEmail('  Jane.Doe@Example.com ')).toBe('jane.doe@example.com');
  });

  it('sends an OTP email', async () => {
    const sender = createEmailSender({
      host: 'localhost',
      port: 1025,
      secure: false,
      from: 'no-reply@railflow.local',
    });

    await sender.sendOtp('jane@example.com', '123456', 5);

    expect(sendMail).toHaveBeenCalledWith({
      from: 'no-reply@railflow.local',
      to: 'jane@example.com',
      subject: 'Your RailFlow verification code',
      text: 'Your RailFlow verification code is 123456. It expires in 5 minutes.',
    });
  });
});
