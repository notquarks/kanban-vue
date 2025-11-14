// server/index.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { authRoutes } from './routes/auth';
import { usersRoutes } from './routes/users';
import { teamsRoutes } from './routes/teams';
import { projectsRoutes } from './routes/projects';
import { boardsRoutes } from './routes/boards';
import { columnsRoutes } from './routes/columns';
import { cardsRoutes } from './routes/cards';
import { prioritiesRoutes } from './routes/priorities';
import { labelsRoutes } from './routes/labels';
import { AuthVariables, requireAuth, optionalAuth, jwtMiddleware } from './middleware/auth';

// Database setup with proper error handling
let db: ReturnType<typeof drizzle>;
try {
  const dbFileName = process.env.DB_FILE_NAME || 'kanban.db';
  const sqlite = new Database(dbFileName);
  db = drizzle({ client: sqlite });
  console.log(`✅ Database connected: ${dbFileName}`);
} catch (error) {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
}

export { db };

// Create main Hono app with proper typing
const app = new Hono<{ Variables: AuthVariables }>();

// Global middleware
app.use('*', logger()); // Request logging
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    message: 'Kanban API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API documentation endpoint
app.get('/', (c) => {
  const isAuthenticated = !!c.get('user');

  return c.json({
    message: 'Kanban Board API',
    version: '1.0.0',
    authenticated: isAuthenticated,
    endpoints: {
      authentication: [
        'POST /api/auth/register - Register new user',
        'POST /api/auth/login - Login user',
        'POST /api/auth/refresh - Refresh token',
        'POST /api/auth/logout - Logout user',
        'POST /api/auth/change-password - Change password',
        'GET /api/auth/me - Get current user',
        'GET /api/auth/admin/users - Get all users (admin only)',
        'GET /api/auth/health - Auth service health',
      ],
      public: [
        'GET /health - Health check',
        'GET / - API documentation',
        'POST /api/users - Create user (public registration)',
      ],
      protected: [
        'GET /api/users - Get all users',
        'GET /api/users/:id - Get user by ID',
        'PUT /api/users/:id - Update user (own profile or admin)',
        'DELETE /api/users/:id - Delete user (admin only)',
        'GET /api/teams - Get all teams',
        'POST /api/teams - Create team',
        'GET /api/teams/:id - Get team by ID',
        'PUT /api/teams/:id - Update team',
        'DELETE /api/teams/:id - Delete team',
        'POST /api/teams/:teamId/users/:userId - Add user to team',
        'DELETE /api/teams/:teamId/users/:userId - Remove user from team',
        'GET /api/projects - Get all projects',
        'POST /api/projects - Create project',
        'GET /api/projects/:id - Get project by ID',
        'PUT /api/projects/:id - Update project',
        'DELETE /api/projects/:id - Delete project',
        'GET /api/projects/:projectId/boards - Get project boards',
        'POST /api/projects/:projectId/boards - Create kanban board',
        'GET /api/boards - Get all boards',
        'GET /api/boards/:id - Get board by ID',
        'PUT /api/boards/:id - Update board',
        'DELETE /api/boards/:id - Delete board',
        'GET /api/boards/:boardId/columns - Get board columns',
        'POST /api/boards/:boardId/columns - Create column',
        'GET /api/columns/:id - Get column by ID',
        'PUT /api/columns/:id - Update column',
        'DELETE /api/columns/:id - Delete column',
        'GET /api/columns/:columnId/cards - Get column cards',
        'POST /api/columns/:columnId/cards - Create card',
        'GET /api/cards - Get all cards',
        'GET /api/cards/:id - Get card by ID',
        'PUT /api/cards/:id - Update card',
        'DELETE /api/cards/:id - Delete card',
        'GET /api/priorities - Get all priorities',
        'POST /api/priorities - Create priority',
        'GET /api/priorities/:id - Get priority by ID',
        'PUT /api/priorities/:id - Update priority',
        'DELETE /api/priorities/:id - Delete priority',
        'GET /api/labels - Get all labels',
        'POST /api/labels - Create label',
        'GET /api/labels/:id - Get label by ID',
        'PUT /api/labels/:id - Update label',
        'DELETE /api/labels/:id - Delete label',
      ]
    },
    usage: {
      authentication: 'Include "Authorization: Bearer <token>" header for protected endpoints',
      examples: {
        register: 'POST /api/auth/register with {name, email, password}',
        login: 'POST /api/auth/login with {email, password}',
        protected: 'GET /api/users with Authorization header',
      }
    }
  });
});

// Route mounting with /api/ prefix

// Public routes (no authentication required)
app.route('/api/auth', authRoutes);

// Users routes - mix of public and protected endpoints
app.route('/api/users', usersRoutes);

// Protected routes - require authentication
const protectedRoutes = new Hono<{ Variables: AuthVariables }>();
// Apply JWT middleware first, then requireAuth
protectedRoutes.use('/*', jwtMiddleware());
protectedRoutes.use('/*', requireAuth());

protectedRoutes.route('/teams', teamsRoutes);
protectedRoutes.route('/projects', projectsRoutes);
protectedRoutes.route('/boards', boardsRoutes);
protectedRoutes.route('/columns', columnsRoutes);
protectedRoutes.route('/cards', cardsRoutes);
protectedRoutes.route('/priorities', prioritiesRoutes);
protectedRoutes.route('/labels', labelsRoutes);

// Mount protected routes with /api/ prefix
app.route('/api', protectedRoutes);

// Optional auth routes (for features that work with or without authentication)
const optionalAuthRoutes = new Hono<{ Variables: Partial<AuthVariables> }>();
optionalAuthRoutes.use('/*', optionalAuth());

// Example: Public boards view that shows more info if authenticated
optionalAuthRoutes.get('/public/boards', async (c) => {
  try {
    const user = c.get('user');
    const isAuthenticated = !!user;

    // This could show public boards or different data based on auth status
    return c.json({
      message: isAuthenticated ? 'Authenticated view' : 'Public view',
      user: user ? { id: user.id, name: user.name } : null,
      boards: [], // Add actual boards query here
    });
  } catch (error) {
    console.error('Public boards error:', error);
    return c.json({ error: 'Failed to fetch boards' }, 500);
  }
});

app.route('/api/public', optionalAuthRoutes);

// Global error handler
app.onError((err, c) => {
  console.error('Global error:', err);

  if (err instanceof HTTPException) {
    return c.json({
      error: err.message,
      status: err.status,
    }, err.status);
  }

  // Handle specific error types
  if (err.name === 'AuthException') {
    return c.json({
      error: err.message,
      code: 'AUTH_ERROR',
    }, 401);
  }

  if (err.name === 'ValidationError') {
    return c.json({
      error: err.message,
      code: 'VALIDATION_ERROR',
    }, 400);
  }

  // Default error response
  return c.json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Route not found',
    message: `The route ${c.req.method} ${c.req.path} does not exist`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/auth/*',
      'GET /api/users',
      'POST /api/users',
      'GET /api/teams (protected)',
      'GET /api/projects (protected)',
      'GET /api/boards (protected)',
      'GET /api/columns (protected)',
      'GET /api/cards (protected)',
      'GET /api/priorities (protected)',
      'GET /api/labels (protected)',
    ]
  }, 404);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server
const port = Number(process.env.PORT) || 3001;

console.log('🚀 Kanban API Server');
console.log(`📍 Port: ${port}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔗 Health check: http://localhost:${port}/health`);
console.log(`📚 Documentation: http://localhost:${port}/`);
console.log(`🔐 Auth endpoints: http://localhost:${port}/api/auth/*`);

export default {
  port,
  fetch: app.fetch,
};
