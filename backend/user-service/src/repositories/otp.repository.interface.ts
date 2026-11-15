export type OtpPurpose = 'EMAIL_VERIFICATION';

export type OtpSession = {
  id: string;
  email: string;
  purpose: OtpPurpose;
  otpHash: string;
  attempts: number;
};

export interface OtpRepository {
  save(session: OtpSession, ttlSeconds: number): Promise<void>;
  findById(id: string): Promise<OtpSession | null>;
  incrementAttempts(id: string): Promise<number>;
  consume(id: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}
