const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforfarmersforus2026');
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  req.user = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforfarmersforus2026');
      req.user = decoded;
    } catch (ex) {
      // ignore invalid token for optional auth
    }
  }
  next();
};

/**
 * Clean 3-Tier Role-Based Access Control:
 * 1. 'farmer' (Farmers, FPOs)
 * 2. 'consumer' (Consumers, Bulk Buyers)
 * 3. 'logistics' (Fleet Drivers, Transport Partners)
 * (Superuser 'admin' has universal override)
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    
    // Normalize role aliases
    const normalizedRole = 
      (userRole === 'fpo') ? 'farmer' :
      (userRole === 'buyer') ? 'consumer' :
      (userRole === 'driver') ? 'logistics' : userRole;

    const allowed = roles.map(r => r.toLowerCase());

    // Admin has superuser access, or role matches allowed list
    if (userRole === 'admin' || allowed.includes(userRole) || allowed.includes(normalizedRole)) {
      return next();
    }

    return res.status(403).json({ 
      success: false, 
      message: `Access denied. This endpoint is restricted to: ${roles.join(', ')}.` 
    });
  };
};

module.exports = { authenticateToken, optionalAuth, authorizeRoles };
