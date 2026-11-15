import type { User } from '../entities/user.entity.js';
import type { OtpPurpose } from '../repositories/otp.repository.interface.js';

export type PublicUser = Omit<User, 'passwordHash' | 'googleId'>;

export type RegisterInput = Pick<User, 'firstName' | 'lastName' | 'email'> & {
  password: string;
};

export type SendOtpInput = Pick<User, 'email'> & { purpose: OtpPurpose };

export type SendOtpResult = {
  otpSessionId: string;
  expiresInSeconds: number;
};

export type RegisterResult = SendOtpResult & {
  user: PublicUser;
};

export type VerifyOtpInput = {
  otpSessionId: string;
  code: string;
};

export interface AuthService {
  register(input: RegisterInput): Promise<RegisterResult>;
  sendOtp(input: SendOtpInput): Promise<SendOtpResult>;
  verifyOtp(input: VerifyOtpInput): Promise<PublicUser>;
}
