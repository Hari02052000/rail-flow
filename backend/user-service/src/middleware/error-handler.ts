import type { ErrorRequestHandler } from 'express';
import { AppError, ErrorCodes, type ErrorCode } from '../errors/app-error.js';

const statusByCode: Record<ErrorCode, number> = {
  [ErrorCodes.Validation]: 400,
  [ErrorCodes.Unauthenticated]: 401,
  [ErrorCodes.Forbidden]: 403,
  [ErrorCodes.NotFound]: 404,
  [ErrorCodes.Conflict]: 409,
  [ErrorCodes.RateLimited]: 429,
  [ErrorCodes.Internal]: 500,
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    const status = statusByCode[error.code];

    if (status >= 500) {
      console.error('Application error:', error);
    }

    res.status(status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  console.error('Unhandled error:', error);

  res.status(500).json({
    error: {
      code: ErrorCodes.Internal,
      message: 'An unexpected error occurred',
    },
  });
};
