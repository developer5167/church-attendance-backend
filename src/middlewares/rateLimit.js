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

// Volunteer submission — strict
exports.volunteerSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 attempts per hour
  message: {
    success: false,
    message: 'Too many submission attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Volunteer status check — relaxed
exports.volunteerStatusLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 requests per minute
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin volunteer endpoints — moderate
exports.adminVolunteerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
