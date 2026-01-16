const express = require('express');
const router = express.Router();
const memberController = require('../controllers/member.controller');
const auth = require('../middlewares/auth.middleware');

const {
  otpLimiter,
  qrLimiter,
  submitLimiter,
} = require('../middlewares/rateLimit');
router.post('/send-otp', otpLimiter, memberController.sendOtp);
router.post('/verify-otp', otpLimiter, memberController.verifyOtp);
router.get('/register/metadata', qrLimiter, memberController.getRegisterMetadata);
router.post('/register/submit', auth,
  submitLimiter, memberController.submitRegistration);
router.post('/profile', auth, memberController.saveProfile);
router.get('/profile', auth, memberController.getProfile);
router.get('/payment-link', auth, memberController.getPaymentLink);
router.post('/baptism-request', auth, memberController.requestBaptism);
router.get('/baptism-request/status', auth, memberController.getBaptismRequestStatus);


module.exports = router;
