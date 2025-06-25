const request = require('supertest');
const app = require('../app');

describe('GET /api/auth/profile', () => {
  let validToken;
  let mockUser;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    jest.mock('../utils/jwt', () => ({
        generateToken: jest.fn(),
    }));
    // Setup default mock user data
    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
    };

    // Generate a valid token for authenticated requests
    validToken = { userId: 'user123' };
    mockJWT.generateToken.mockReturnValue(validToken);
    mockJWT.verifyToken.mockReturnValue(validToken);
  });

  describe('Authentication Required', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });

    it('should return 401 when authorization header is invalid', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Invalid token-format');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });

    it('should return 401 when token is expired', async () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      mockJWT.verifyToken.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Token expired',
      });
    });

    it('should return 401 when token is invalid', async () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      mockJWT.verifyToken.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Invalid token',
      });
    });
  });

  describe('Successful Profile Retrieval', () => {
    it('should return user profile with deck count when authenticated', async () => {
      const mockUserWithCount = {
        id: 'user123',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        _count: {
          decks: 5,
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithCount);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: {
          id: 'user123',
          email: 'test@example.com',
          createdAt: '2023-01-01T00:00:00.000Z',
          _count: {
            decks: 5,
          },
        },
      });
    });

    it('should return user profile with zero deck count', async () => {
      const mockUserWithZeroDecks = {
        id: 'user456',
        email: 'newuser@example.com',
        createdAt: new Date('2023-06-15T10:30:00.000Z'),
        _count: {
          decks: 0,
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithZeroDecks);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        user: {
          id: 'user456',
          email: 'newuser@example.com',
          createdAt: '2023-06-15T10:30:00.000Z',
          _count: {
            decks: 0,
          },
        },
      });
    });

    it('should query database with correct parameters', async () => {
      const mockUserWithCount = {
        id: 'user123',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01'),
        _count: { decks: 3 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithCount);

      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' }, // This should match the user ID from req.user
        select: {
          id: true,
          email: true,
          createdAt: true,
          _count: {
            select: {
              decks: true,
            },
          },
        },
      });
    });

    it('should not include sensitive fields in response', async () => {
      const mockUserWithCount = {
        id: 'user123',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01'),
        _count: { decks: 2 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithCount);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.updatedAt).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      const dbError = new Error('Database connection failed');

      mockPrisma.user.findUnique.mockRejectedValue(dbError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Authentication failed',
      });

      expect(consoleSpy).toHaveBeenCalledWith('Authentication error:', dbError);
      consoleSpy.mockRestore();
    });

    it('should return 500 when database query throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected database error');
      unexpectedError.name = "PrismaClientInitializationError";
      mockPrisma.user.findUnique.mockRejectedValue(unexpectedError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Failed to get user profile',
      });

      expect(consoleSpy).toHaveBeenCalledWith('Get profile error:', unexpectedError);
      consoleSpy.mockRestore();
    });

    it('should handle case when user is not found (edge case)', async () => {
      // This shouldn't normally happen since middleware checks user existence,
      // but testing for robustness
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

        console.log(response.body)
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'User no longer exists'
      });
    });
  });

  describe('Different User Scenarios', () => {
    it('should handle user with many decks', async () => {
      const mockUserWithManyDecks = {
        id: 'power-user',
        email: 'poweruser@example.com',
        createdAt: new Date('2022-01-01T00:00:00.000Z'),
        _count: {
          decks: 50,
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithManyDecks);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user._count.decks).toBe(50);
    });

    it('should handle user created at different times', async () => {
      const mockRecentUser = {
        id: 'recent-user',
        email: 'recent@example.com',
        createdAt: new Date(),
        _count: {
          decks: 1,
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockRecentUser);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe('recent-user');
      expect(response.body.user.email).toBe('recent@example.com');
    });
  });

  describe('Integration with Authentication Middleware', () => {
    it('should use user ID from req.user set by middleware', async () => {
      const mockUserData = {
        id: 'middleware-user-id',
        email: 'middleware@example.com',
        createdAt: new Date('2023-01-01'),
        _count: { decks: 3 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUserData);

      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      // Verify that the database query uses the user ID from req.user
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: expect.any(String) },
        select: {
          id: true,
          email: true,
          createdAt: true,
          _count: {
            select: {
              decks: true,
            },
          },
        },
      });
    });
  });

  describe('Response Format Validation', () => {
    it('should return response in correct format', async () => {
      const mockUserWithCount = {
        id: 'user123',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01'),
        _count: { decks: 5 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithCount);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('createdAt');
      expect(response.body.user).toHaveProperty('_count');
      expect(response.body.user._count).toHaveProperty('decks');
      expect(typeof response.body.user.id).toBe('string');
      expect(typeof response.body.user.email).toBe('string');
      expect(typeof response.body.user._count.decks).toBe('number');
    });

    it('should return proper content type', async () => {
      const mockUserWithCount = {
        id: 'user123',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01'),
        _count: { decks: 2 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithCount);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});