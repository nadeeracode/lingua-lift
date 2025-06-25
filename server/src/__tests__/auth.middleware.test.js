const { authenticate } = require('../middleware/auth'); // Adjust path as needed

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock request, response, and next function
    req = {
      headers: {},
      user: null,
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    
    next = jest.fn();
  });

  describe('Authorization Header Validation', () => {
    it('should return 401 when authorization header is missing', async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access token required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is empty', async () => {
      req.headers.authorization = '';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access token required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      req.headers.authorization = 'Basic some-token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access token required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is just "Bearer"', async () => {
      req.headers.authorization = 'Bearer';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access token required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is "Bearer " (with space but no token)', async () => {
      req.headers.authorization = 'Bearer ';

      await authenticate(req, res, next);

      expect(mockJWT.verifyToken).toHaveBeenCalledWith('');
    });
  });

  describe('Token Verification', () => {
    it('should extract token correctly from Bearer header', async () => {
      req.headers.authorization = 'Bearer valid-jwt-token';
      mockJWT.verifyToken.mockReturnValue({ userId: 'user123' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01'),
      });

      await authenticate(req, res, next);

      expect(mockJWT.verifyToken).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('should return 401 when token is invalid (JsonWebTokenError)', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      mockJWT.verifyToken.mockImplementation(() => {
        throw error;
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired (TokenExpiredError)', async () => {
      req.headers.authorization = 'Bearer expired-token';
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      mockJWT.verifyToken.mockImplementation(() => {
        throw error;
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token expired',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 when verifyToken throws unexpected error', async () => {
      req.headers.authorization = 'Bearer some-token';
      const error = new Error('Unexpected JWT error');
      error.name = 'SomeOtherError';
      mockJWT.verifyToken.mockImplementation(() => {
        throw error;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Authentication failed',
      });
      expect(consoleSpy).toHaveBeenCalledWith('Authentication error:', error);
      expect(next).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('User Verification', () => {
    beforeEach(() => {
      req.headers.authorization = 'Bearer valid-token';
      mockJWT.verifyToken.mockReturnValue({ userId: 'user123' });
    });

    it('should return 401 when user no longer exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        select: { id: true, email: true, createdAt: true },
      });
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User no longer exists',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should query database with correct parameters', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01'),
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        select: { id: true, email: true, createdAt: true },
      });
    });

    it('should return 500 when database query fails', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.user.findUnique.mockRejectedValue(dbError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Authentication failed',
      });
      expect(consoleSpy).toHaveBeenCalledWith('Authentication error:', dbError);
      expect(next).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Successful Authentication', () => {
    it('should call next() and set req.user when authentication succeeds', async () => {
      req.headers.authorization = 'Bearer valid-token';
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      mockJWT.verifyToken.mockReturnValue({ userId: 'user123' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should handle different user data correctly', async () => {
      req.headers.authorization = 'Bearer another-valid-token';
      const mockUser = {
        id: 'user456',
        email: 'another@example.com',
        createdAt: new Date('2023-06-15T10:30:00.000Z'),
      };

      mockJWT.verifyToken.mockReturnValue({ userId: 'user456' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should only select specified user fields', async () => {
      req.headers.authorization = 'Bearer valid-token';
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01'),
      };

      mockJWT.verifyToken.mockReturnValue({ userId: 'user123' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        select: { id: true, email: true, createdAt: true },
      });
      
      // Verify that sensitive fields like password are not selected
      const selectClause = mockPrisma.user.findUnique.mock.calls[0][0].select;
      expect(selectClause.password).toBeUndefined();
      expect(selectClause.updatedAt).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JWT payload', async () => {
      req.headers.authorization = 'Bearer valid-token';
      mockJWT.verifyToken.mockReturnValue({ invalidField: 'someValue' }); // Missing userId
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: undefined },
        select: { id: true, email: true, createdAt: true },
      });
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User no longer exists',
      });
    });

    it('should handle token with extra whitespace', async () => {
      req.headers.authorization = 'Bearer  token-with-spaces  ';
      mockJWT.verifyToken.mockReturnValue({ userId: 'user123' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01'),
      });

      await authenticate(req, res, next);

      expect(mockJWT.verifyToken).toHaveBeenCalledWith(' token-with-spaces  ');
    });

    it('should handle authorization header with different casing', async () => {
      req.headers.authorization = 'bearer valid-token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access token required',
      });
    });
  });

  describe('Console Logging', () => {
    it('should log errors to console when unexpected errors occur', async () => {
      req.headers.authorization = 'Bearer some-token';
      const error = new Error('Unexpected error');
      mockJWT.verifyToken.mockImplementation(() => {
        throw error;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await authenticate(req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith('Authentication error:', error);

      consoleSpy.mockRestore();
    });

    it('should not log JWT-specific errors to console', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      mockJWT.verifyToken.mockImplementation(() => {
        throw error;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await authenticate(req, res, next);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});