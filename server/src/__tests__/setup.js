const { PrismaClient } = require('@prisma/client');

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  deck: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  card: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  studyData: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $disconnect: jest.fn(),
};

// Mock the database module
jest.mock('../utils/db', () => mockPrisma);

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock JWT utilities
jest.mock('../utils/jwt', () => ({
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
}));

// Mock UUID
const mockUUIDVal = '12345678';
jest.mock('uuid', () => ({
  v4: () => mockUUIDVal
}));

// Make mocked modules available globally
global.mockPrisma = mockPrisma;
global.mockBcrypt = require('bcryptjs');
global.mockJWT = require('../utils/jwt');
global.mockUUID = require('uuid');
global.mockUUIDVal = mockUUIDVal;

// Clean up mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Set up environment variables for testing
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '7d';
process.env.NODE_ENV = 'test';