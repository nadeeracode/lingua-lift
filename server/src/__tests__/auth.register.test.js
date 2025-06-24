const request = require('supertest');
const app = require('../app');

describe('POST /api/auth/register', () => {
  const validUserData = {
    email: 'test@example.com',
    password: 'password123',
  };

  describe('Successful Registration', () => {
    beforeEach(() => {
      // Mock successful database operations
      mockPrisma.user.findUnique.mockResolvedValue(null); // User doesn't exist
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date(),
      });
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      mockJWT.generateToken.mockReturnValue('jwt-token-123');
    });

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toEqual({
        message: 'User registered successfully',
        token: 'jwt-token-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          createdAt: expect.any(String),
        },
      });

      // Verify database interactions
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          id: mockUUIDVal,
          email: 'test@example.com',
          password: 'hashed-password',
        },
        select: {
          email: true,
          createdAt: true,
        },
      });
      expect(mockJWT.generateToken).toHaveBeenCalledWith({
        userId: 'user-123',
      });
    });

    it('should normalize email to lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: 'password123',
        })
        .expect(201);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          id: mockUUIDVal,
          email: 'test@example.com',
          password: 'hashed-password',
        },
        select: {
          email: true,
          createdAt: true,
        },
      });
    });

    it('should use 12 salt rounds for password hashing', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });
  });

  describe('Validation Errors', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123' })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return 400 if both email and password are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
    });

    it('should return 400 if email is empty string', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: '', password: 'password123' })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
    });

    it('should return 400 if email is only whitespace', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: '   ', password: 'password123' })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
    });

    it('should return 400 if password is empty string', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: '' })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
    });

    it('should return 400 if password is less than 6 characters', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: '12345' })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Password must be at least 6 characters long',
      });
    });

    it('should accept password exactly 6 characters', async () => {
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date(),
      });
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      mockJWT.generateToken.mockReturnValue('jwt-token-123');

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: '123456' })
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
    });
  });

  describe('Duplicate Email Handling', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user-123',
        email: 'test@example.com',
      });
    });

    it('should return 400 if user already exists', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(400);

      expect(response.body).toEqual({
        message: 'User with this email already exists',
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive email duplication', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: 'password123',
        })
        .expect(400);

      expect(response.body).toEqual({
        message: 'User with this email already exists',
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('Database Errors', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
    });

    it('should handle database connection errors during user lookup', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Failed to register user',
      });
    });

    it('should handle database errors during user creation', async () => {
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      mockPrisma.user.create.mockRejectedValue(new Error('Database write failed'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Failed to register user',
      });
    });

    it('should handle unique constraint violation errors', async () => {
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      const uniqueConstraintError = new Error('Unique constraint violation');
      uniqueConstraintError.code = 'P2002';
      mockPrisma.user.create.mockRejectedValue(uniqueConstraintError);

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(400);

      expect(response.body).toEqual({
        message: 'A record with this data already exists',
      });
    });
  });

  describe('Password Hashing Errors', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
    });

    it('should handle bcrypt hashing errors', async () => {
      mockBcrypt.hash.mockRejectedValue(new Error('Hashing failed'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Failed to register user',
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('JWT Token Generation', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date(),
      });
      mockBcrypt.hash.mockResolvedValue('hashed-password');
    });

    it('should generate JWT token with correct payload', async () => {
      mockJWT.generateToken.mockReturnValue('jwt-token-123');

      const res = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);
      console.log(res.body);
      expect(mockJWT.generateToken).toHaveBeenCalledWith({
        userId: 'user-123',
      });
    });

    it('should handle JWT generation errors', async () => {
      mockJWT.generateToken.mockImplementation(() => {
        throw new Error('JWT generation failed');
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(500);

      expect(response.body).toEqual({
        message: 'Failed to register user',
      });
    });
  });

  describe('Request Body Edge Cases', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
    });

    it('should handle null email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: null, password: 'password123' })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
    });

    it('should handle null password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: null })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
    });

    it('should handle undefined values', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: undefined, password: undefined })
        .expect(400);

      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
    });

    it('should handle extra fields in request body', async () => {
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date(),
      });
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      mockJWT.generateToken.mockReturnValue('jwt-token-123');
      //mockUUID.uuidv4.mockReturnValue('1111');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
          age: 30,
        })
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      // Should only use email and password, ignore extra fields
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          id: mockUUIDVal,
          email: 'test@example.com',
          password: 'hashed-password',
        },
        select: {
          email: true,
          createdAt: true,
        },
      });
    });

    it('should handle very long password', async () => {
      const longPassword = 'a'.repeat(1000);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date(),
      });
      mockBcrypt.hash.mockResolvedValue('hashed-long-password');
      mockJWT.generateToken.mockReturnValue('jwt-token-123');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: longPassword,
        })
        .expect(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(mockBcrypt.hash).toHaveBeenCalledWith(longPassword, 12);
    });

    it('should handle very long email', async () => {
      const longEmail = 'a'.repeat(100) + '@example.com';
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: longEmail.toLowerCase(),
        createdAt: new Date(),
      });
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      mockJWT.generateToken.mockReturnValue('jwt-token-123');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: longEmail,
          password: 'password123',
        })
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
    });
  });

  describe('Response Format Validation', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date('2023-01-01T00:00:00Z'),
      });
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      mockJWT.generateToken.mockReturnValue('jwt-token-123');
    });

    it('should return correct response structure', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('createdAt');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not include password in response', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.user).not.toHaveProperty('password');
      expect(JSON.stringify(response.body)).not.toContain('hashed-password');
    });
  });
});