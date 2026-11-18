const { ERROR_MESSAGES } = require('../constants/errorMessages');

const KNOWN_MESSAGES = new Set(
  Object.values(ERROR_MESSAGES).flatMap((group) => Object.values(group))
);

const errorHandler = (err, req, res, next) => {
  // Always log server-side so production failures show up in hosting logs (Vercel/Render)
  console.error('[ErrorHandler]', req.method, req.originalUrl, err.code || '', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message },
    });
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: { code: 'ALREADY_EXISTS', message: ERROR_MESSAGES.GENERIC.ALREADY_EXISTS },
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: ERROR_MESSAGES.GENERIC.NOT_FOUND },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: ERROR_MESSAGES.AUTH.SESSION_EXPIRED },
    });
  }

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Only pass through messages that are our own friendly constants — never leak internals
  const message = KNOWN_MESSAGES.has(err.message)
    ? err.message
    : ERROR_MESSAGES.GENERIC.INTERNAL;

  return res.status(status).json({
    success: false,
    error: { code, message },
  });
};

module.exports = { errorHandler };
