const errorHandler = (err, req, res, next) => {
  // Always log server-side so production failures show up in hosting logs (Vercel/Render)
  console.error('[ErrorHandler]', req.method, req.originalUrl, err.code || '', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Resource already exists' });
    }
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
};

module.exports = { errorHandler };