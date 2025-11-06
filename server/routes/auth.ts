import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';
import { verify } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import { db } from '../index';
import { usersTable } from '../db/schema';
import type {
  AuthVariables,
  SafeUser,
  JWTPayload
} from '../middleware/auth';
import {
  generateToken,
  hashPassword,
  verifyPassword,
  jwtMiddleware,
  requireAuth,
  requireAdmin,
  createSafeUser,
  isValidEmail,
  isValidPassword,
  AuthException
} from '../middleware/auth';

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  message: string;
  user: SafeUser;
  token: string;
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

export const authRoutes = new Hono<{ Variables: AuthVariables }>();

authRoutes.post(
  '/register',
  validator('json', (value, c) => {
    const body = value as RegisterRequest;


    if (!body.name?.trim()) {
      return c.json({ error: 'Name is required' } as ErrorResponse, 400);
    }

    if (!body.email?.trim()) {
      return c.json({ error: 'Email is required' } as ErrorResponse, 400);
    }

    if (!body.password?.trim()) {
      return c.json({ error: 'Password is required' } as ErrorResponse, 400);
    }


    if (!isValidEmail(body.email)) {
      return c.json({ error: 'Invalid email format' } as ErrorResponse, 400);
    }


    const passwordValidation = isValidPassword(body.password);
    if (!passwordValidation.valid) {
      return c.json({ error: passwordValidation.message } as ErrorResponse, 400);
    }


    if (body.name.length < 2 || body.name.length > 50) {
      return c.json({ error: 'Name must be between 2 and 50 characters' } as ErrorResponse, 400);
    }

    return body;
  }),
  async (c) => {
    try {
      const { name, email, password } = c.req.valid('json') as RegisterRequest;


      const [existingUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email.toLowerCase()))
        .limit(1);

      if (existingUser) {
        throw new AuthException('User with this email already exists', 409);
      }


      const passwordHash = await hashPassword(password);


      const [user] = await db
        .insert(usersTable)
        .values({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          passwordHash,
          status: 'active',
          isAdmin: false, // Default to non-admin
        })
        .returning();


      const token = await generateToken(user);


      const safeUser = createSafeUser(user);

      const response: AuthResponse = {
        message: 'User registered successfully',
        user: safeUser,
        token,
      };

      return c.json(response, 201);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Registration error:', error);
      throw new AuthException('Registration failed', 500);
    }
  }
);

authRoutes.post(
  '/login',
  validator('json', (value, c) => {
    const body = value as LoginRequest;

    if (!body.email?.trim()) {
      return c.json({ error: 'Email is required' } as ErrorResponse, 400);
    }

    if (!body.password?.trim()) {
      return c.json({ error: 'Password is required' } as ErrorResponse, 400);
    }

    if (!isValidEmail(body.email)) {
      return c.json({ error: 'Invalid email format' } as ErrorResponse, 400);
    }

    return body;
  }),
  async (c) => {
    try {
      const { email, password } = c.req.valid('json') as LoginRequest;


      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email.toLowerCase()))
        .limit(1);

      if (!user) {
        throw new AuthException('Invalid email or password', 401);
      }


      if (user.status !== 'active') {
        throw new AuthException('Account is not active', 403);
      }


      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        throw new AuthException('Invalid email or password', 401);
      }


      await db
        .update(usersTable)
        .set({ lastLoginAt: new Date() })
        .where(eq(usersTable.id, user.id));


      const token = await generateToken(user);


      const safeUser = createSafeUser(user);

      const response: AuthResponse = {
        message: 'Login successful',
        user: safeUser,
        token,
      };

      return c.json(response);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Login error:', error);
      throw new AuthException('Login failed', 500);
    }
  }
);

authRoutes.get(
  '/me',
  jwtMiddleware(),
  requireAuth(),
  async (c) => {
    const user = c.get('user');
    const safeUser = createSafeUser(user);

    return c.json({ user: safeUser });
  }
);

authRoutes.post(
  '/refresh',
  async (c) => {
    try {
      const authHeader = c.req.header('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AuthException('No token provided', 401);
      }

      const token = authHeader.substring(7);
      const payload = await verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this-in-production') as unknown as JWTPayload;

      // Check if token is expired but still valid structure
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        // Token is expired, but we allow refresh with a short grace period
        const gracePeriod = 300; // 5 minutes
        if (payload.exp + gracePeriod < currentTime) {
          throw new AuthException('Token too old to refresh', 401);
        }
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, payload.userId))
        .limit(1);

      if (!user) {
        throw new AuthException('User not found', 401);
      }

      if (user.status !== 'active') {
        throw new AuthException('Account is not active', 403);
      }

      const newToken = await generateToken(user);
      const safeUser = createSafeUser(user);

      const response: AuthResponse = {
        message: 'Token refreshed successfully',
        user: safeUser,
        token: newToken,
      };

      return c.json(response);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }
      console.error('Token refresh error:', error);
      throw new AuthException('Token refresh failed', 401);
    }
  }
);

authRoutes.post(
  '/logout',
  jwtMiddleware(),
  requireAuth(),
  async (c) => {
    // Logout successful - client will clear local storage
    // No server-side update needed since we don't track last logout time

    return c.json({ message: 'Logout successful' });
  }
);

authRoutes.post(
  '/change-password',
  jwtMiddleware(),
  requireAuth(),
  validator('json', (value, c) => {
    const body = value as { currentPassword: string; newPassword: string };

    if (!body.currentPassword?.trim()) {
      return c.json({ error: 'Current password is required' } as ErrorResponse, 400);
    }

    if (!body.newPassword?.trim()) {
      return c.json({ error: 'New password is required' } as ErrorResponse, 400);
    }

    const passwordValidation = isValidPassword(body.newPassword);
    if (!passwordValidation.valid) {
      return c.json({ error: passwordValidation.message } as ErrorResponse, 400);
    }

    return body;
  }),
  async (c) => {
    try {
      const { currentPassword, newPassword } = c.req.valid('json') as {
        currentPassword: string;
        newPassword: string;
      };

      const user = c.get('user');


      const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new AuthException('Current password is incorrect', 401);
      }


      const newPasswordHash = await hashPassword(newPassword);


      await db
        .update(usersTable)
        .set({ passwordHash: newPasswordHash })
        .where(eq(usersTable.id, user.id));

      return c.json({ message: 'Password changed successfully' });
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Change password error:', error);
      throw new AuthException('Failed to change password', 500);
    }
  }
);

authRoutes.get(
  '/admin/users',
  jwtMiddleware(),
  requireAuth(),
  requireAdmin(),
  async (c) => {
    try {
      const users = await db.select().from(usersTable);
      const safeUsers = users.map(createSafeUser);

      return c.json({ users: safeUsers });
    } catch (error) {
      console.error('Admin users error:', error);
      throw new AuthException('Failed to fetch users', 500);
    }
  }
);

authRoutes.onError((err, c) => {
  if (err instanceof AuthException) {
    return c.json({ error: err.message }, err.status);
  }

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  console.error('Unhandled auth error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

authRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'authentication',
    timestamp: new Date().toISOString(),
  });
});
