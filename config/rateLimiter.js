const rateLimit = require('express-rate-limit');

// General rate limiter for public routes (e.g. login, otp send)
const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 OTP requests per windowMs
  message: {
    success: false,
    message: 'Too many OTP requests from this IP, please try again after 15 minutes.',
    errorCode: 'TOO_MANY_REQUESTS',
    data: null
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = {
  otpRateLimiter
};
