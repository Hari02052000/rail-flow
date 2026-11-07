export const ErrorCodes = {
  Validation: 'VALIDATION_ERROR',
  Unauthenticated: 'UNAUTHENTICATED',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  Conflict: 'CONFLICT',
  RateLimited: 'RATE_LIMITED',
  Internal: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface AppErrorOptions {
  cause?: unknown;
  details?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly isOperational = true;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });

    this.name = new.target.name;
    this.code = code;
    this.details = options.details;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request', options: AppErrorOptions = {}) {
    super(ErrorCodes.Validation, message, options);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', options: AppErrorOptions = {}) {
    super(ErrorCodes.Unauthenticated, message, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', options: AppErrorOptions = {}) {
    super(ErrorCodes.Forbidden, message, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', options: AppErrorOptions = {}) {
    super(ErrorCodes.NotFound, message, options);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', options: AppErrorOptions = {}) {
    super(ErrorCodes.Conflict, message, options);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', options: AppErrorOptions = {}) {
    super(ErrorCodes.RateLimited, message, options);
  }
}
