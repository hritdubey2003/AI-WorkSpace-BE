const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { ERROR_MESSAGES } = require('../constants/errorMessages');

const register = async ({ name, email, password }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error(ERROR_MESSAGES.AUTH.EMAIL_TAKEN);
    err.status = 409;
    err.code = 'EMAIL_TAKEN';
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const token = generateToken(user.id);
  return { user, token };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const token = generateToken(user.id);
  return {
    user: { id: user.id, name: user.name, email: user.email },
    token,
  };
};

module.exports = { register, login };
