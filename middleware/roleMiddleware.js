const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

/**
 * Middleware to protect admin routes and verify admin JWT
 */
const adminProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode and verify JWT
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Verify it is an admin user token
      if (!decoded.role || !['SUPER_ADMIN', 'MODERATOR', 'SUPPORT'].includes(decoded.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Invalid token payload for admin services',
          errorCode: 'FORBIDDEN',
          data: null
        });
      }

      // Fetch admin user
      const admin = await AdminUser.findById(decoded.id);
      if (!admin || !admin.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Admin account is inactive or not found',
          errorCode: 'ADMIN_ACCOUNT_DISABLED',
          data: null
        });
      }

      // Attach admin user to request
      req.admin = admin;
      next();
    } catch (error) {
      console.error(error);
      let errorCode = 'UNAUTHORIZED';
      let message = 'Not authorized, token failed';

      if (error.name === 'TokenExpiredError') {
        errorCode = 'TOKEN_EXPIRED';
        message = 'Admin access token expired';
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
      message: 'Not authorized, no admin token provided',
      errorCode: 'NO_TOKEN',
      data: null
    });
  }
};

/**
 * Middleware to restrict access based on admin roles
 * @param {Array<string>} roles - Allowed roles (e.g. ['SUPER_ADMIN', 'MODERATOR'])
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin context missing',
        errorCode: 'UNAUTHORIZED',
        data: null
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}] roles. Your role: ${req.admin.role}`,
        errorCode: 'FORBIDDEN',
        data: null
      });
    }

    next();
  };
};

module.exports = {
  adminProtect,
  requireRole
};
