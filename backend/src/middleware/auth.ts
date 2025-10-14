import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthUser {
  userId: string;
  email: string;
  role: string;
  address?: string;
}

declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as AuthUser;
    
    // Check if user has admin role
    if (!['super_admin', 'admin', 'operator'].includes(decoded.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// Session-based authentication for user operations
export const authenticateSession = (req: Request, res: Response, next: NextFunction) => {
  const sessionToken = req.headers['x-session-token'] as string;
  
  // Extract user address from request body or headers
  const userAddress = req.body.userAddress || req.headers['x-user-address'] as string;
  
  // In development mode, be more lenient with authentication
  if (process.env.NODE_ENV === 'development') {
    // If no session token but we have user address, generate one
    if (!sessionToken && userAddress) {
      req.user = {
        userId: userAddress,
        email: '',
        role: 'user',
        address: userAddress
      };
      return next();
    }
    
    // If session token doesn't start with 'anon_' but we have user address, accept it
    if (sessionToken && userAddress) {
      req.user = {
        userId: userAddress,
        email: '',
        role: 'user',
        address: userAddress
      };
      return next();
    }
  }
  
  if (!sessionToken) {
    return res.status(401).json({ 
      success: false, 
      message: 'Session token required' 
    });
  }

  // For now, we'll accept any session token that starts with 'anon_'
  // In a real implementation, you'd validate against a session store
  if (!sessionToken.startsWith('anon_')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid session token' 
    });
  }

  if (!userAddress) {
    return res.status(400).json({ 
      success: false, 
      message: 'User address required' 
    });
  }

  // Set user info for the request
  req.user = {
    userId: userAddress,
    email: '',
    role: 'user',
    address: userAddress
  };

  next();
};
