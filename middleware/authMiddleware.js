const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Get user from token and attach to request
      req.user = await User.findById(decoded.id);
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found',
          errorCode: 'USER_NOT_FOUND',
          data: null
        });
      }

      next();
    } catch (error) {
      console.error(error);
      let errorCode = 'UNAUTHORIZED';
      let message = 'Not authorized, token failed';

      if (error.name === 'TokenExpiredError') {
        errorCode = 'TOKEN_EXPIRED';
        message = 'Access token expired';
      }

      return res.status(401).json({
        success: false,
        message,
        errorCode,
        data: null
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
      errorCode: 'NO_TOKEN',
      data: null
    });
  }
};

module.exports = { protect };
