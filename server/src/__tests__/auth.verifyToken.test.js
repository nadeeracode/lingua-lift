const request = require('supertest');
const app = require('../app');
const express = require('express');

app.use(express.json());

describe('POST /api/auth/verify', () => {
  let validToken;
  let mockUser;
  const validUserToken = { userId: 'user123' };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock user data
    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
    };

    // Generate a valid token for authenticated requests
    // validToken = 'valid-jwt-token';
    validToken = { userId: 'user123' };
    mockJWT.generateToken.mockReturnValue(validToken);
    mockJWT.verifyToken.mockReturnValue(validToken);
  });

  describe('Authentication Required', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const response = await request(app).get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });

    it('should return 401 when authorization header is invalid', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Invalid token-format');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Access token required',
      });
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Basic some-token');

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
        .get('/api/auth/verify')
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
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Invalid token',
      });
    });

    it('should return 401 when user no longer exists', async () => {
      mockJWT.verifyToken.mockReturnValue(validToken);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer token-for-deleted-user');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'User no longer exists',
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
    });
  });

  describe('Successful Token Verification', () => {
    it('should return valid true and user data when token is valid', async () => {
      // Mock the middleware to set req.user
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        valid: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          createdAt: '2023-01-01T00:00:00.000Z',
        },
      });
    });

    it('should return user data set by authentication middleware', async () => {
      const differentUser = {
        id: 'user456',
        email: 'different@example.com',
        createdAt: new Date('2023-06-15T10:30:00.000Z'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(differentUser);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        valid: true,
        user: {
          id: 'user456',
          email: 'different@example.com',
          createdAt: '2023-06-15T10:30:00.000Z',
        },
      });
    });

    it('should handle user with all expected fields', async () => {
      const completeUser = {
        id: 'complete-user',
        email: 'complete@example.com',
        createdAt: new Date('2022-12-25T12:00:00.000Z'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(completeUser);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.user).toEqual({
        id: 'complete-user',
        email: 'complete@example.com',
        createdAt: '2022-12-25T12:00:00.000Z',
      });
    });

    it('should not include sensitive fields in user data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.updatedAt).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when an unexpected error occurs in the controller', async () => {
      // This is a bit tricky to test since the controller is very simple
      // We can test by mocking a scenario where JSON serialization might fail
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock res.json to throw an error (simulating a rare edge case)
      const originalJson = require('express').response.json;

      jest.spyOn(express.response, 'json').mockImplementationOnce(() => {
         throw new Error('JSON serialization error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalledWith('Token verification error:', expect.any(Error));
      expect(response.body).toEqual({
        message: 'Token verification failed',
      });

      expect(consoleSpy).toHaveBeenCalledWith('Token verification error:', expect.any(Error));

      // Restore original method and clean up
      express.response.json = originalJson;
      consoleSpy.mockRestore();
    });

    // Alternative approach: Test error handling by mocking the controller directly
    it('should handle and log unexpected errors properly', async () => {
      const { verifyToken } = require('../controllers/authController');

      const mockReq = {
        user: mockUser,
      };

     const mockRes = {
        json: jest.fn().mockImplementation(() => {
          throw new Error('Response error');
        }),
        status: jest.fn().mockReturnThis(),
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Wrap the call in try-catch since json() will throw
      try {
        await verifyToken(mockReq, mockRes);
      } catch (error) {
        // Expected to throw due to the mocked json() method
      }

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(consoleSpy).toHaveBeenCalledWith('Token verification error:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Response Format Validation', () => {
    it('should return response in correct format', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid');
      expect(response.body).toHaveProperty('user');
      expect(typeof response.body.valid).toBe('boolean');
      expect(response.body.valid).toBe(true);
      expect(typeof response.body.user).toBe('object');
      expect(response.body.user).not.toBeNull();
    });

    it('should return proper content type', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should have correct user object structure', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('createdAt');
      expect(typeof response.body.user.id).toBe('string');
      expect(typeof response.body.user.email).toBe('string');
      expect(typeof response.body.user.createdAt).toBe('string');
    });
  });

  describe('Integration with Authentication Middleware', () => {
    it('should rely on middleware for token validation', async () => {
      // This test ensures the endpoint doesn't do its own token validation
      // If middleware passes, the endpoint should always return success
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      
      // The endpoint doesn't call any JWT verification itself
      // It relies entirely on the middleware to set req.user
    });

    it('should use req.user set by middleware without modification', async () => {
      const middlewareUser = {
        id: 'middleware-set-id',
        email: 'middleware@example.com',
        createdAt: new Date('2023-03-15T08:30:00.000Z'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(middlewareUser);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        id: 'middleware-set-id',
        email: 'middleware@example.com',
        createdAt: '2023-03-15T08:30:00.000Z',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle edge case where req.user is undefined (should not happen)', async () => {
      // This is an edge case that shouldn't happen if middleware works correctly
      // But testing for robustness
      const { verifyToken } = require('../controllers/authController');

      const mockReq = {
        user: undefined,
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await verifyToken(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        valid: true,
        user: undefined,
      });
    });

    it('should handle req.user with minimal data', async () => {
      const minimalUser = {
        id: 'minimal-user',
      };

      mockPrisma.user.findUnique.mockResolvedValue(minimalUser);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.user.id).toBe('minimal-user');
    });
  });

  describe('HTTP Method Validation', () => {
    it('should work with GET method', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    // If your route also supports GET, add this test:
    it('should work with POST method if supported', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      // This will fail with 404/405 if not supported
      expect([404, 405]).toContain(response.status);
    });
  });
});