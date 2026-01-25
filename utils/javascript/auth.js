const jwt = require('jsonwebtoken');
const { errorResponse } = require('./message');

/**
 * Extract Bearer token from request headers
 * @param {Object} req - Express request object
 * @returns {string|null} Bearer token or null if not found
 */
function _getBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth) {
    return null;
  }
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = auth.split(' ', 2)[1]?.trim();
  return token || null;
}

/**
 * Decode and verify JWT token
 * @param {string} token - JWT token string
 * @returns {Object} Decoded JWT claims
 * @throws {Error} If token is invalid or expired
 */
function _decodeJWT(token) {
  const secret = process.env.JWT_SECRET;
  const alg = process.env.JWT_ALG || 'HS256';
  
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.decode(token, secret, { algorithms: [alg] });
}

/**
 * Verify JWT token (decode and validate signature)
 * @param {string} token - JWT token string
 * @returns {Object} Decoded JWT claims
 * @throws {Error} If token is invalid or expired
 */
function _verifyJWT(token) {
  const secret = process.env.JWT_SECRET;
  const alg = process.env.JWT_ALG || 'HS256';
  
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.verify(token, secret, { algorithms: [alg] });
}

/**
 * Express middleware for JWT authentication (login_required equivalent)
 * Validates JWT token and attaches normalized user object to req.user
 */
function loginRequired(req, res, next) {
  const token = _getBearerToken(req);
  
  if (!token) {
    console.log(`[${new Date().toISOString()}] [WARN] Missing Bearer token - IP: ${req.ip}`);
    return errorResponse('Missing Bearer token', 401)(req, res);
  }

  try {
    const claims = _verifyJWT(token);
    
    const userId = claims.sub || claims.id;
    if (userId === null || userId === undefined) {
      return errorResponse('Token missing sub/id', 401)(req, res);
    }

    // type = role (user/admin/super)
    const role = (claims.type || '').trim().toLowerCase();

    // status = unverified/active/banned
    const status = (claims.status || '').trim().toLowerCase();
    const validStatuses = ['unverified', 'active', 'banned'];
    if (!validStatuses.includes(status)) {
      // If unknown, treat as unauthorized to be safe
      return errorResponse('Invalid status claim', 401)(req, res);
    }

    if (status === 'banned') {
      console.log(`[${new Date().toISOString()}] [WARN] Banned user attempted access - UserId: ${userId}`);
      return errorResponse('User is banned', 403)(req, res);
    }

    // Normalize for controllers
    req.user = {
      userId: String(userId),
      role: role,                 // user/admin/super
      status: status,             // unverified/active/banned
      verified: status !== 'unverified',
      ...claims
    };

    console.log(`[${new Date().toISOString()}] [INFO] JWT authenticated - UserId: ${userId}, Role: ${role}, Status: ${status}`);
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log(`[${new Date().toISOString()}] [WARN] Expired token - IP: ${req.ip}`);
      return errorResponse('Token expired', 401)(req, res);
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'InvalidTokenError') {
      console.log(`[${new Date().toISOString()}] [WARN] Invalid token - IP: ${req.ip}`);
      return errorResponse('Invalid token', 401)(req, res);
    }
    // Re-throw unexpected errors
    next(error);
  }
}

/**
 * Express middleware factory for role-based authorization (permission_checking equivalent)
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
function permissionChecking(...allowedRoles) {
  const normalizedRoles = new Set(
    allowedRoles
      .filter(role => role)
      .map(role => role.trim().toLowerCase())
  );

  return function(req, res, next) {
    const user = req.user;
    
    if (!user) {
      console.log(`[${new Date().toISOString()}] [WARN] permissionChecking called without authenticated user`);
      return errorResponse('Missing user context', 401)(req, res);
    }

    const role = (user.role || '').trim().toLowerCase();
    
    if (normalizedRoles.size > 0 && !normalizedRoles.has(role)) {
      console.log(`[${new Date().toISOString()}] [WARN] Insufficient permissions - UserId: ${user.userId}, Role: ${role}, Required: ${Array.from(normalizedRoles).join(', ')}, IP: ${req.ip}`);
      return errorResponse('Insufficient permissions', 403)(req, res);
    }

    console.log(`[${new Date().toISOString()}] [INFO] Permission granted - UserId: ${user.userId}, Role: ${role}`);
    next();
  };
}

module.exports = {
  loginRequired,
  permissionChecking,
  _getBearerToken,
  _decodeJWT,
  _verifyJWT
};
