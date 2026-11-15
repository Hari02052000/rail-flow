import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const OTP_CODE_LENGTH = 6;

const OTP_MAX_VALUE = 10 ** OTP_CODE_LENGTH;

export const generateOtpCode = (): string =>
  randomInt(0, OTP_MAX_VALUE).toString().padStart(OTP_CODE_LENGTH, '0');

export const generateOtpSessionId = (): string => randomBytes(32).toString('base64url');

export const hashOtp = (code: string, secret: string): string =>
  createHmac('sha256', secret).update(code).digest('hex');

export const verifyOtpHash = (code: string, expectedHash: string, secret: string): boolean => {
  const actual = Buffer.from(hashOtp(code, secret), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
};
