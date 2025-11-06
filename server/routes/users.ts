// server/routes/users.ts
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';
import { eq, and, ne, like } from 'drizzle-orm';
import { db } from '../index';
import { usersTable } from '../db/schema';
import {
  type AuthVariables,
  type SafeUser,
  createSafeUser,
  requireAuth,
  requireAdmin,
  hashPassword,
  AuthException
} from '../middleware/auth';

// Type definitions for request bodies
interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  isAdmin?: boolean;
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  passwordHash?: string;
  status?: string;
  isAdmin?: boolean;
}

// Type definitions for responses
interface UserResponse {
  user: SafeUser;
}

interface UsersResponse {
  users: SafeUser[];
}

interface MessageResponse {
  message: string;
  success: boolean;
}

interface ErrorResponse {
  error: string;
  details?: unknown;
}

// Create users router with proper typing
export const usersRoutes = new Hono<{ Variables: AuthVariables }>();

// Public registration endpoint (alternative to auth/register)
usersRoutes.post(
  '/',
  validator('json', (value, c) => {
    const body = value as CreateUserRequest;

    // Validate required fields
    if (!body.name?.trim()) {
      return c.json({ error: 'Name is required' } as ErrorResponse, 400);
    }

    if (!body.email?.trim()) {
      return c.json({ error: 'Email is required' } as ErrorResponse, 400);
    }

    if (!body.password?.trim()) {
      return c.json({ error: 'Password is required' } as ErrorResponse, 400);
    }

    // Validate name length
    if (body.name.length < 2 || body.name.length > 50) {
      return c.json({ error: 'Name must be between 2 and 50 characters' } as ErrorResponse, 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return c.json({ error: 'Invalid email format' } as ErrorResponse, 400);
    }

    // Password validation
    if (body.password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters long' } as ErrorResponse, 400);
    }

    // Only allow admin creation if explicitly allowed
    if (body.isAdmin && !process.env.ALLOW_ADMIN_REGISTRATION) {
      delete body.isAdmin;
    }

    return body;
  }),
  async (c) => {
    try {
      const { name, email, password, isAdmin = false } = c.req.valid('json') as CreateUserRequest;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email.toLowerCase()))
        .limit(1);

      if (existingUser) {
        throw new AuthException('User with this email already exists', 409);
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const [user] = await db
        .insert(usersTable)
        .values({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          passwordHash,
          isAdmin,
          status: 'active',
        })
        .returning();

      // Create safe user response
      const safeUser = createSafeUser(user);

      const response: UserResponse = {
        user: safeUser,
      };

      return c.json(response, 201);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('User creation error:', error);
      throw new AuthException('Failed to create user', 500);
    }
  }
);

// Get all users (authenticated users only)
usersRoutes.get(
  '/',
  requireAuth(),
  async (c) => {
    try {
      const currentUser = c.get('user');
      const isAdmin = currentUser.isAdmin;

      let users: typeof usersTable.$inferSelect[];

      if (isAdmin) {
        // Admins can see all users
        users = await db.select().from(usersTable);
      } else {
        // Regular users can see only active users
        users = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.status, 'active'));
      }

      // Create safe users response
      const safeUsers = users.map(createSafeUser);

      const response: UsersResponse = {
        users: safeUsers,
      };

      return c.json(response);
    } catch (error) {
      console.error('Get users error:', error);
      throw new AuthException('Failed to fetch users', 500);
    }
  }
);

// Get user by ID (authenticated users only)
usersRoutes.get(
  '/:id',
  requireAuth(),
  async (c) => {
    try {
      const id = c.req.param('id');
      const currentUser = c.get('user');

      // Users can only get their own profile unless they're admin
      if (currentUser.id !== id && !currentUser.isAdmin) {
        throw new AuthException('Forbidden: You can only access your own profile', 403);
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);

      if (!user) {
        throw new AuthException('User not found', 404);
      }

      // Create safe user response
      const safeUser = createSafeUser(user);

      const response: UserResponse = {
        user: safeUser,
      };

      return c.json(response);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Get user error:', error);
      throw new AuthException('Failed to fetch user', 500);
    }
  }
);

// Update user (authenticated users only)
usersRoutes.put(
  '/:id',
  requireAuth(),
  validator('json', (value, c) => {
    const body = value as UpdateUserRequest;

    // Validate name if provided
    if (body.name !== undefined) {
      if (!body.name?.trim()) {
        return c.json({ error: 'Name cannot be empty' } as ErrorResponse, 400);
      }

      if (body.name.length < 2 || body.name.length > 50) {
        return c.json({ error: 'Name must be between 2 and 50 characters' } as ErrorResponse, 400);
      }
    }

    // Validate email if provided
    if (body.email !== undefined) {
      if (!body.email?.trim()) {
        return c.json({ error: 'Email cannot be empty' } as ErrorResponse, 400);
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return c.json({ error: 'Invalid email format' } as ErrorResponse, 400);
      }
    }

    // Validate password if provided
    if (body.password !== undefined) {
      if (!body.password?.trim()) {
        return c.json({ error: 'Password cannot be empty' } as ErrorResponse, 400);
      }

      if (body.password.length < 8) {
        return c.json({ error: 'Password must be at least 8 characters long' } as ErrorResponse, 400);
      }
    }

    // Validate status if provided
    if (body.status !== undefined) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(body.status)) {
        return c.json({ error: 'Invalid status' } as ErrorResponse, 400);
      }
    }

    return body;
  }),
  async (c) => {
    try {
      const id = c.req.param('id');
      const updateData = c.req.valid('json') as UpdateUserRequest;
      const currentUser = c.get('user');

      // Users can only update their own profile unless they're admin
      if (currentUser.id !== id && !currentUser.isAdmin) {
        throw new AuthException('Forbidden: You can only update your own profile', 403);
      }

      // Regular users cannot change admin status or status
      if (!currentUser.isAdmin) {
        delete updateData.isAdmin;
        delete updateData.status;
      }

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);

      if (!existingUser) {
        throw new AuthException('User not found', 404);
      }

      // Check email uniqueness if email is being changed
      if (updateData.email && updateData.email !== existingUser.email) {
        const [emailCheck] = await db
          .select()
          .from(usersTable)
          .where(and(
            eq(usersTable.email, updateData.email.toLowerCase()),
            ne(usersTable.id, id)
          ))
          .limit(1);

        if (emailCheck) {
          throw new AuthException('Email already exists', 409);
        }

        updateData.email = updateData.email.toLowerCase().trim();
      }

      // Hash password if it's being updated
      if (updateData.password) {
        const passwordHash = await hashPassword(updateData.password);
        updateData.passwordHash = passwordHash;
        delete updateData.password;
      }

      // Clean up name if provided
      if (updateData.name) {
        updateData.name = updateData.name.trim();
      }

      // Update user
      const [updatedUser] = await db
        .update(usersTable)
        .set(updateData)
        .where(eq(usersTable.id, id))
        .returning();

      // Create safe user response
      const safeUser = createSafeUser(updatedUser);

      const response: UserResponse = {
        user: safeUser,
      };

      return c.json(response);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Update user error:', error);
      throw new AuthException('Failed to update user', 500);
    }
  }
);

// Delete user (admin only)
usersRoutes.delete(
  '/:id',
  requireAuth(),
  requireAdmin(),
  async (c) => {
    try {
      const id = c.req.param('id');
      const currentUser = c.get('user');

      // Prevent self-deletion
      if (currentUser.id === id) {
        throw new AuthException('Cannot delete your own account', 403);
      }

      // Check if user exists
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);

      if (!user) {
        throw new AuthException('User not found', 404);
      }

      // Delete user
      await db.delete(usersTable).where(eq(usersTable.id, id));

      const response: MessageResponse = {
        message: 'User deleted successfully',
        success: true,
      };

      return c.json(response);
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Delete user error:', error);
      throw new AuthException('Failed to delete user', 500);
    }
  }
);

// Search users (authenticated users only)
usersRoutes.get(
  '/search/:query',
  requireAuth(),
  async (c) => {
    try {
      const query = c.req.param('query');


      if (!query?.trim()) {
        throw new AuthException('Search query is required', 400);
      }

      // Simple search implementation - in production, you might want full-text search
      const users = await db
        .select()
        .from(usersTable)
        .where(and(
          eq(usersTable.status, 'active'),
          // This is a simplified search - in production, use proper search operators
          // For SQLite, you might use LIKE operator
          like(usersTable.name, `%${query}%`)
        ))
        .limit(20); // Limit results

      const safeUsers = users.map(createSafeUser);

      return c.json({ users: safeUsers, query, count: safeUsers.length });
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }

      console.error('Search users error:', error);
      throw new AuthException('Failed to search users', 500);
    }
  }
);

// Global error handler for users routes
usersRoutes.onError((err, c) => {
  if (err instanceof AuthException) {
    return c.json({ error: err.message }, err.status);
  }

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  console.error('Unhandled users error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});
