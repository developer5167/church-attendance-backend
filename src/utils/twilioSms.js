const twilio = require("twilio");
require('dotenv').config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendOtpSms(phone, otp) {
  return client.messages.create({
    body: `Your Church App OTP is ${otp}. Valid for 5 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone.startsWith("+") ? phone : `+91${phone}`,
  });
}

module.exports = { sendOtpSms };
