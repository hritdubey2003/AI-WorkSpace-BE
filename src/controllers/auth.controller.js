const authService = require('../services/auth.service');
const { ERROR_MESSAGES } = require('../constants/errorMessages');

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALL_FIELDS_REQUIRED', message: ERROR_MESSAGES.AUTH.ALL_FIELDS_REQUIRED },
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'PASSWORD_TOO_SHORT', message: ERROR_MESSAGES.AUTH.PASSWORD_TOO_SHORT },
      });
    }

    const result = await authService.register({ name, email, password });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_PASSWORD_REQUIRED', message: ERROR_MESSAGES.AUTH.EMAIL_PASSWORD_REQUIRED },
      });
    }

    const result = await authService.login({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { register, login, getMe };
