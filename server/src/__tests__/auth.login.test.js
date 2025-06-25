const request = require('supertest');
const app = require('../app');

describe('POST /api/auth/login', () => {
  const validUserData = {
    email: 'test@example.com',
    password: 'password123',
  };

  describe('Input Validation', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
    });

    it('should return 400 when both email and password are missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
    });

    it('should return 400 when email is empty string', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
    });

    it('should return 400 when password is empty string', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: '',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'Email and password are required',
      });
    });
  });

  describe('User Authentication', () => {
    it('should return 401 when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Invalid email or password',
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
    });

    it('should return 401 when password is incorrect', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        createdAt: new Date('2023-01-01'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: 'Invalid email or password',
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
    });

    it('should handle email case insensitivity', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        createdAt: new Date('2023-01-01'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.generateToken.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('Successful Login', () => {
    it('should return 200 with token and user data when login is successful', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.generateToken.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Login successful',
        token: 'mock-jwt-token',
        user: {
          id: 'user123',
          email: 'test@example.com',
          createdAt: '2023-01-01T00:00:00.000Z',
        },
      });

      expect(mockJWT.generateToken).toHaveBeenCalledWith({ userId: 'user123' });
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.updatedAt).toBeUndefined();
    });

    it('should call bcrypt.compare with correct parameters', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        createdAt: new Date('2023-01-01'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.generateToken.mockReturnValue('mock-jwt-token');

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'plainTextPassword',
        });

      expect(mockBcrypt.compare).toHaveBeenCalledWith('plainTextPassword', 'hashedPassword');
    });

    it('should generate token with correct payload', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        createdAt: new Date('2023-01-01'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.generateToken.mockReturnValue('mock-jwt-token');

      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(mockJWT.generateToken).toHaveBeenCalledWith({ userId: 'user123' });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Failed to login',
      });
    });

    it('should return 500 when bcrypt.compare throws an error', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        createdAt: new Date('2023-01-01'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Failed to login',
      });
    });

    it('should return 500 when token generation fails', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        createdAt: new Date('2023-01-01'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.generateToken.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Failed to login',
      });
    });
  });

  describe('Security', () => {
    it('should not return password in response', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        createdAt: new Date('2023-01-01'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJWT.generateToken.mockReturnValue('mock-jwt-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.updatedAt).toBeUndefined();
    });

    it('should return same message for non-existent user and wrong password', async () => {
      // Test non-existent user
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      // Test wrong password
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        createdAt: new Date('2023-01-01'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response1.body.message).toBe(response2.body.message);
      expect(response1.status).toBe(response2.status);
    });
  });
})