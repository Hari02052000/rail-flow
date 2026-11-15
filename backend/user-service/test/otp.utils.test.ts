import { describe, expect, it } from 'vitest';
import { generateOtpCode, generateOtpSessionId, hashOtp, verifyOtpHash } from '../src/utils/otp.js';

const secret = 'test-secret-at-least-16-characters';

describe('OTP utilities', () => {
  it('generates six-digit codes', () => {
    for (let index = 0; index < 50; index += 1) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it('generates unique session ids', () => {
    expect(generateOtpSessionId()).not.toBe(generateOtpSessionId());
  });

  it('hashes deterministically and verifies the hash', () => {
    const hash = hashOtp('123456', secret);

    expect(hash).toBe(hashOtp('123456', secret));
    expect(verifyOtpHash('123456', hash, secret)).toBe(true);
    expect(verifyOtpHash('654321', hash, secret)).toBe(false);
  });

  it('rejects malformed hashes', () => {
    expect(verifyOtpHash('123456', 'not-a-hex-hash', secret)).toBe(false);
  });
});
