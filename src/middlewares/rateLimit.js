const rateLimit = require('express-rate-limit');

// OTP — very strict
exports.otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // max 5 OTP requests
  message: {
    message: 'Too many OTP requests. Please wait.',
  },
});

// QR scan — moderate
exports.qrLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // enough for camera retries
  message: {
    message: 'Too many QR requests. Slow down.',
  },
});

// Registration submit — strict
exports.submitLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: {
    message: 'Too many submissions.',
  },
});
