const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { ERROR_MESSAGES } = require('../constants/errorMessages');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: ERROR_MESSAGES.AUTH.REQUIRED },
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: ERROR_MESSAGES.AUTH.REQUIRED },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: ERROR_MESSAGES.AUTH.SESSION_EXPIRED },
    });
  }
};

module.exports = { authenticate };
