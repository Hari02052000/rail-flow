import type { User } from '../entities/user.entity.js';
import { ConflictError, RateLimitError, ValidationError } from '../errors/app-error.js';
import type { OtpRepository } from '../repositories/otp.repository.interface.js';
import type { UserRepository } from '../repositories/user.repository.interface.js';
import { normalizeEmail, type EmailSender } from '../utils/email.js';
import { generateOtpCode, generateOtpSessionId, hashOtp, verifyOtpHash } from '../utils/otp.js';
import { hashPassword } from '../utils/password.js';
import type {
  AuthService,
  PublicUser,
  RegisterInput,
  RegisterResult,
  SendOtpInput,
  SendOtpResult,
  VerifyOtpInput,
} from './auth.service.interface.js';

export interface AuthServiceConfig {
  otpSecret: string;
  otpTtlSeconds: number;
  otpMaxAttempts: number;
}

const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export class DefaultAuthService implements AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpRepository: OtpRepository,
    private readonly emailSender: EmailSender,
    private readonly config: AuthServiceConfig,
  ) {}

  async register(input: RegisterInput): Promise<RegisterResult> {
    const email = normalizeEmail(input.email);
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await this.userRepository.create({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      passwordHash,
      googleId: null,
      emailVerified: false,
    });

    const otp = await this.sendOtp({ email, purpose: 'EMAIL_VERIFICATION' });

    return { user: toPublicUser(user), ...otp };
  }

  async sendOtp(input: SendOtpInput): Promise<SendOtpResult> {
    const email = normalizeEmail(input.email);
    const sessionId = generateOtpSessionId();
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return { otpSessionId: sessionId, expiresInSeconds: this.config.otpTtlSeconds };
    }

    const code = generateOtpCode();

    await this.otpRepository.save(
      {
        id: sessionId,
        email,
        purpose: input.purpose,
        otpHash: hashOtp(code, this.config.otpSecret),
        attempts: 0,
      },
      this.config.otpTtlSeconds,
    );

    await this.emailSender.sendOtp(email, code, Math.ceil(this.config.otpTtlSeconds / 60));

    return { otpSessionId: sessionId, expiresInSeconds: this.config.otpTtlSeconds };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<PublicUser> {
    const session = await this.otpRepository.findById(input.otpSessionId);

    if (!session) {
      throw new ValidationError('Invalid or expired OTP');
    }

    if (session.attempts >= this.config.otpMaxAttempts) {
      await this.otpRepository.delete(session.id);
      throw new RateLimitError('Too many OTP attempts');
    }

    if (!verifyOtpHash(input.code, session.otpHash, this.config.otpSecret)) {
      const attempts = await this.otpRepository.incrementAttempts(session.id);

      if (attempts >= this.config.otpMaxAttempts) {
        await this.otpRepository.delete(session.id);
        throw new RateLimitError('Too many OTP attempts');
      }

      throw new ValidationError('Invalid or expired OTP');
    }

    const consumed = await this.otpRepository.consume(session.id);

    if (!consumed) {
      throw new ValidationError('Invalid or expired OTP');
    }

    const user = await this.userRepository.findByEmail(session.email);

    if (!user) {
      throw new ValidationError('Invalid or expired OTP');
    }

    if (!user.emailVerified) {
      await this.userRepository.setEmailVerified(user.id, true);
      const updatedUser = await this.userRepository.findById(user.id);

      if (!updatedUser) {
        throw new ValidationError('Invalid or expired OTP');
      }

      return toPublicUser(updatedUser);
    }

    return toPublicUser(user);
  }
}
