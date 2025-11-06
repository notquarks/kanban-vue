# Kanban API Authentication System

This document explains the authentication system implemented for the Kanban API using Hono best practices.

## Overview

The authentication system provides:
- JWT-based authentication
- Role-based access control (Admin/User)
- Password hashing with bcrypt
- Input validation and sanitization
- Comprehensive error handling
- TypeScript type safety

## Features

### Authentication Endpoints

#### Public Endpoints
- `POST /auth/register` - Register a new user
- `POST /auth/login` - User login
- `POST /users` - Alternative registration endpoint
- `GET /health` - Health check
- `GET /` - API documentation

#### Protected Endpoints (Authentication Required)
- `GET /auth/me` - Get current user profile
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - Logout user
- `POST /auth/change-password` - Change password
- All CRUD operations for teams, projects, boards, columns, cards, priorities, labels

#### Admin-Only Endpoints
- `GET /auth/admin/users` - Get all users (admin only)
- `DELETE /users/:id` - Delete user (admin only)

### Security Features

1. **Password Security**
   - bcrypt hashing with 12 rounds
   - Minimum 8 character passwords
   - Password complexity requirements (uppercase, lowercase, numbers)

2. **JWT Security**
   - HS256 algorithm
   - Configurable expiration (default: 7 days)
   - Token validation and expiration checks

3. **Input Validation**
   - Email format validation
   - Name length limits (2-50 characters)
   - Title and description limits
   - SQL injection prevention through Drizzle ORM

4. **Rate Limiting Ready**
   - Error handling structure supports rate limiting
   - Custom exception types for different error scenarios

## Usage Examples

### Registration

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### Using the Token

```bash
# Get current user
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get cards (protected endpoint)
curl -X GET http://localhost:3001/cards \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a card
curl -X POST http://localhost:3001/cards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "New Task",
    "description": "Task description",
    "columnId": "column-id",
    "priorityId": 1
  }'
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### Required Variables

- `JWT_SECRET` - Secret key for JWT signing (change in production!)
- `DB_FILE_NAME` - SQLite database file name
- `PORT` - Server port (default: 3001)

### Optional Variables

- `JWT_EXPIRES_IN` - Token expiration (default: 7d)
- `ALLOW_ADMIN_REGISTRATION` - Allow admin user registration
- `NODE_ENV` - Environment (development/production)
- `BCRYPT_ROUNDS` - bcrypt rounds (default: 12)
- `CORS_ORIGIN` - Allowed CORS origins

## Database Seeding

The seeding script creates test users with properly hashed passwords:

```bash
bun run seed
```

### Test Users

- **Admin User**: alice@kanban.com / admin123
- **Regular Users**: bob@kanban.com / user123, carol@kanban.com / user123, etc.

## Error Handling

The API uses consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Error Codes

- `AUTH_ERROR` - Authentication-related errors
- `VALIDATION_ERROR` - Input validation errors
- `INTERNAL_ERROR` - Server internal errors

## Response Formats

### Success Response (Authentication)

```json
{
  "message": "Login successful",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "isAdmin": false,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token-string"
}
```

### Data Response (Protected Endpoint)

```json
{
  "users": [
    {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com",
      "isAdmin": false,
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Middleware Usage

The authentication system provides several middleware options:

```typescript
import { requireAuth, requireAdmin, optionalAuth } from './middleware/auth';

// Require authentication
app.use('/protected', requireAuth());

// Require admin role
app.use('/admin', requireAdmin());

// Optional authentication (doesn't throw if no token)
app.use('/public', optionalAuth());
```

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong JWT secrets
   - Different secrets for development/production

2. **Password Security**
   - Minimum 8 characters
   - Mixed case, numbers, special characters
   - Regular password expiration for users

3. **Token Security**
   - Store tokens securely on client-side
   - Implement token refresh mechanism
   - Handle token expiration gracefully

4. **API Security**
   - Use HTTPS in production
   - Implement rate limiting
   - Log authentication attempts
   - Validate all inputs

## Development Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. Seed the database:
   ```bash
   bun run seed
   ```

4. Start the server:
   ```bash
   bun run server
   ```

## Testing Authentication

Use the seeded test users to test the system:

```bash
# Test admin login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@kanban.com",
    "password": "admin123"
  }'

# Test regular user login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@kanban.com", 
    "password": "user123"
  }'
```

## Integration with Frontend

1. Store JWT token securely (httpOnly cookies recommended)
2. Include token in Authorization header for protected requests
3. Handle 401 responses (redirect to login)
4. Implement token refresh before expiration
5. Handle logout by removing stored token

## Production Considerations

1. **Environment Setup**
   - Use production database
   - Strong JWT secrets
   - HTTPS-only cookies
   - Proper CORS configuration

2. **Security Headers**
   - Implement proper security headers
   - Use helmet.js or similar
   - Configure CSP headers

3. **Monitoring**
   - Log authentication attempts
   - Monitor failed logins
   - Implement rate limiting
   - Set up alerts for suspicious activity

4. **Performance**
   - Database connection pooling
   - Token caching
   - Request/response compression
   - CDN for static assets

## Troubleshooting

### Common Issues

1. **"Invalid token" error**
   - Check token format
   - Verify JWT_SECRET matches
   - Check token expiration

2. **"User not found" error**
   - Verify user exists in database
   - Check user ID format

3. **CORS issues**
   - Verify CORS_ORIGIN settings
   - Check frontend URL configuration

### Debug Mode

Set `LOG_LEVEL=debug` in `.env` for detailed logging.

## Contributing

When adding new protected endpoints:

1. Use `requireAuth()` middleware
2. Add proper TypeScript types
3. Implement input validation
4. Add comprehensive error handling
5. Update API documentation
6. Add tests for authentication scenarios

## License

This authentication system is part of the Kanban API project.