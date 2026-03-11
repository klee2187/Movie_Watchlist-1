const jwt = require('jsonwebtoken');
const keys = require('../config/keys');
 
// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  // Check for JWT token in cookies or Authorization header
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
 
  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || keys.session.SECRET,
      );
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  }
 
  // Fall back to session auth for web interface
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
 
  res.status(401).json({
    success: false,
    message: 'Authentication required',
  });
};
 
// Optional authentication - doesn't error if not authenticated
const optionalAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
 
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
 
  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || keys.session.SECRET,
      );
      req.user = decoded;
    } catch (err) {
      // Token invalid - continue as unauthenticated (this is correct for optionalAuth)
      console.log(
        'Invalid token in optionalAuth, continuing as unauthenticated',
      );
    }
  }
 
  next();
};
 
module.exports = {
  isAuthenticated,
  optionalAuth,
};