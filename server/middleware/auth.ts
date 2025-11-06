import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { jwt, sign, verify } from 'hono/jwt';
import type { JwtVariables } from 'hono/jwt';
import { db } from '../index';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Environment variables with fallbacks
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

const BCRYPT_ROUNDS = 12;

// Type for our JWT payload - compatible with Hono's JWTPayload
export interface JWTPayload extends Record<string, unknown> {
  userId: string;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

// Type for our context variables
export type AuthVariables = {
  jwtPayload: JWTPayload;
  user: typeof usersTable.$inferSelect;
} & JwtVariables;

// Type for safe user response (without password)
export type SafeUser = Omit<typeof usersTable.$inferSelect, 'passwordHash'>;

// Custom exception for authentication errors
export class AuthException extends HTTPException {
  constructor(message: string, status = 401) {
    super(status as 401 | 403 | 404 | 500, { message });
    this.name = 'AuthException';
  }
}

export const generateToken = async (user: typeof usersTable.$inferSelect): Promise<string> => {
  const currentTime = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    iat: currentTime,
    exp: currentTime + (60 * 60 * 24 * 14) // 14 days in seconds
  };

  return await sign(payload, JWT_SECRET);
};

export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  } catch {
    throw new AuthException('Failed to hash password', 500);
  }
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    throw new AuthException('Failed to verify password', 500);
  }
};

export const jwtMiddleware = () => {
  return jwt({
    secret: JWT_SECRET,
    alg: 'HS256',
    headerName: 'Authorization',
  });
};


export const requireAuth = () => {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    try {
      const payload = c.get('jwtPayload') as JWTPayload;
      if (!payload) {
        throw new AuthException('No token provided', 401);
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        throw new AuthException('Token expired', 401);
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, payload.userId))
        .limit(1);

      if (!user) {
        throw new AuthException('User not found', 401);
      }

      c.set('user', user);
      await next();
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }
      throw new AuthException('Authentication failed', 401);
    }
  };
};

export const requireAdmin = () => {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const user = c.get('user');
    if (!user || !user.isAdmin) {
      throw new AuthException('Admin access required', 403);
    }
    await next();
  };
};

export const optionalAuth = () => {
  return async (c: Context<{ Variables: Partial<AuthVariables> }>, next: Next) => {
    try {
      const authHeader = c.req.header('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        await next();
        return;
      }

      const token = authHeader.substring(7);
      const payload = await verify(token, JWT_SECRET) as unknown as JWTPayload;

      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        await next();
        return;
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, payload.userId))
        .limit(1);

      if (user) {
        c.set('user', user);
      }
    } catch {
    }

    await next();
  };
};

export const createSafeUser = (user: typeof usersTable.$inferSelect): SafeUser => {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  return { valid: true };
};
