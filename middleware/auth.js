// Simple token-based authentication middleware for admin routes
const adminAuth = (req, res, next) => {
  try {
    const token = req.header('x-admin-token');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Admin token required. Please provide x-admin-token header.'
      });
    }

    // For now, using a simple hardcoded token
    // In production, this should be a proper JWT validation
    const validToken = process.env.ADMIN_TOKEN || 'mysecrettoken';
    
    if (token !== validToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Invalid admin token provided.'
      });
    }

    // Token is valid, proceed to next middleware
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Error validating admin token'
    });
  }
};

module.exports = { adminAuth }; 