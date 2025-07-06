const request = require('supertest');
const app = require('../app');
const { SRSService } = require('../utils/srsService');

// Mock SRS Service
jest.mock('../utils/srsService', () => ({
  SRSService: {
    getCardsForReview: jest.fn(),
    calculateNextReview: jest.fn(),
  },
}));

// Mock authentication middleware
const mockUser = {
  id: 'user123',
  email: 'test@example.com'
};

jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = mockUser;
    next();
  }
}));

describe('Study Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/study/decks/:deckId/cards  - getStudyCards', () => {
    it('should return study cards for a deck with existing study data', async () => {
      const mockDeck = {
        id: 'deck1',
        title: 'Spanish Verbs',
        userId: 'user123',
        cards: [
          {
            id: 'card1',
            front: 'Hola',
            back: 'Hello',
            deckId: 'deck1',
            studyData: [{
              id: 'study1',
              userId: 'user123',
              cardId: 'card1',
              easeFactor: 2.5,
              interval: 1,
              nextReview: new Date(),
              repetitions: 0
            }]
          },
          {
            id: 'card2',
            front: 'Gracias',
            back: 'Thank you',
            deckId: 'deck1',
            studyData: [{
              id: 'study2',
              userId: 'user123',
              cardId: 'card2',
              easeFactor: 2.5,
              interval: 1,
              nextReview: new Date(),
              repetitions: 0
            }]
          }
        ]
      };

      const mockDueCards = [
        {
          id: 'study1',
          userId: 'user123',
          cardId: 'card1',
          easeFactor: 2.5,
          interval: 1,
          nextReview: new Date(),
          repetitions: 0
        }
      ];
 
      //Check if the mock findFirst method is a function
      console.log('mockPrisma.deck.findFirst:', typeof global.mockPrisma.deck.findFirst);
      //Check if the findFirst method is a jest mock
      console.log('Is it a jest mock?', jest.isMockFunction(global.mockPrisma.deck.findFirst));

      mockPrisma.deck.findFirst.mockResolvedValue(mockDeck);
      SRSService.getCardsForReview.mockReturnValue(mockDueCards);

      const response = await request(app)
        .get('/api/study/deck/deck1/cards')
        .expect(200);

      //Check how many times the mock method was called.
      console.log('Mock was called:', global.mockPrisma.deck.findFirst.mock.calls.length, 'times');
      //Check the mock calls
      console.log('Mock calls:', global.mockPrisma.deck.findFirst.mock.calls);

      expect(response.body).toHaveProperty('cards');
      expect(response.body).toHaveProperty('totalCards', 2);
      expect(response.body).toHaveProperty('dueCards', 1);
      expect(response.body).toHaveProperty('newCards', 1);
      expect(response.body.cards).toHaveLength(1);
      expect(response.body.cards[0].id).toBe('card1');
    });

    it('should create initial study data for cards without study data', async () => {
      const mockDeck = {
        id: 'deck1',
        title: 'Spanish Verbs',
        userId: 'user123',
        cards: [
          {
            id: 'card1',
            front: 'Hola',
            back: 'Hello',
            deckId: 'deck1',
            studyData: []
          }
        ]
      };

      const mockCreatedStudyData = {
        id: 'study1',
        userId: 'user123',
        cardId: 'card1',
        easeFactor: 2.5,
        interval: 1,
        nextReview: new Date(),
        repetitions: 0
      };

      mockPrisma.deck.findFirst.mockResolvedValue(mockDeck);
      mockPrisma.studyData.create.mockResolvedValue(mockCreatedStudyData);
      SRSService.getCardsForReview.mockReturnValue([]);

      const response = await request(app)
        .get('/api/study/deck/deck1/cards')
        .expect(200);

      expect(mockPrisma.studyData.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          cardId: 'card1',
          easeFactor: 2.5,
          interval: 1,
          nextReview: expect.any(Date),
          repetitions: 0
        }
      });
      expect(response.body).toHaveProperty('cards');
      expect(response.body.cards).toHaveLength(1);
    });

    it('should return new cards when no due cards exist', async () => {
      const mockDeck = {
        id: 'deck1',
        title: 'Spanish Verbs',
        userId: 'user123',
        cards: Array.from({ length: 15 }, (_, i) => ({
          id: `card${i + 1}`,
          front: `Front ${i + 1}`,
          back: `Back ${i + 1}`,
          deckId: 'deck1',
          studyData: [{
            id: `study${i + 1}`,
            userId: 'user123',
            cardId: `card${i + 1}`,
            easeFactor: 2.5,
            interval: 1,
            nextReview: new Date(Date.now() + 86400000), // Tomorrow
            repetitions: 0
          }]
        }))
      };

      mockPrisma.deck.findFirst.mockResolvedValue(mockDeck);
      SRSService.getCardsForReview.mockReturnValue([]);

      const response = await request(app)
        .get('/api/study/deck/deck1/cards')
        .expect(200);

      expect(response.body).toHaveProperty('cards');
      expect(response.body.cards).toHaveLength(10); // Limited to 10 new cards
      expect(response.body).toHaveProperty('dueCards', 0);
      expect(response.body).toHaveProperty('newCards', 15);
    });

    it('should return 404 if deck not found', async () => {
      mockPrisma.deck.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/study/deck/nonexistent/cards')
        .expect(404);

      expect(response.body).toEqual({ error: 'Deck not found' });
    });

    it('should handle database errors', async () => {
      mockPrisma.deck.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/study/deck/deck1/cards')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to get study cards' });
    });
  });

  describe('POST /api/study/response - submitStudyResponse', () => {
    it('should submit study response and update SRS data', async () => {
      const responseData = {
        cardId: 'card1',
        quality: 1 // Easy
      };

      const mockCurrentStudyData = {
        id: 'study1',
        userId: 'user123',
        cardId: 'card1',
        easeFactor: 2.5,
        interval: 1,
        nextReview: new Date(),
        repetitions: 0
      };

      const mockNextReviewData = {
        easeFactor: 2.6,
        interval: 6,
        nextReview: new Date(Date.now() + 6 * 86400000),
        repetitions: 1,
        lastReviewed: new Date()
      };

      const mockUpdatedStudyData = {
        id: 'study1',
        userId: 'user123',
        cardId: 'card1',
        ...mockNextReviewData
      };

      mockPrisma.studyData.findUnique.mockResolvedValue(mockCurrentStudyData);
      SRSService.calculateNextReview.mockReturnValue(mockNextReviewData);
      mockPrisma.studyData.update.mockResolvedValue(mockUpdatedStudyData);

      const response = await request(app)
        .post('/api/study/response')
        .send(responseData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        nextReview: mockUpdatedStudyData.nextReview.toISOString(),
        interval: mockUpdatedStudyData.interval
      });

      expect(mockPrisma.studyData.findUnique).toHaveBeenCalledWith({
        where: {
          userId_cardId: {
            userId: 'user123',
            cardId: 'card1'
          }
        }
      });

      expect(SRSService.calculateNextReview).toHaveBeenCalledWith(mockCurrentStudyData, 1);

      expect(mockPrisma.studyData.update).toHaveBeenCalledWith({
        where: {
          userId_cardId: {
            userId: 'user123',
            cardId: 'card1'
          }
        },
        data: mockNextReviewData
      });
    });

    it('should handle hard response (quality 0)', async () => {
      const responseData = {
        cardId: 'card1',
        quality: 0 // Hard
      };

      const mockCurrentStudyData = {
        id: 'study1',
        userId: 'user123',
        cardId: 'card1',
        easeFactor: 2.5,
        interval: 1,
        nextReview: new Date(),
        repetitions: 0
      };

      const mockNextReviewData = {
        easeFactor: 2.18,
        interval: 1,
        nextReview: new Date(Date.now() + 86400000),
        repetitions: 0,
        lastReviewed: new Date()
      };

      const mockUpdatedStudyData = {
        id: 'study1',
        userId: 'user123',
        cardId: 'card1',
        ...mockNextReviewData
      };

      mockPrisma.studyData.findUnique.mockResolvedValue(mockCurrentStudyData);
      SRSService.calculateNextReview.mockReturnValue(mockNextReviewData);
      mockPrisma.studyData.update.mockResolvedValue(mockUpdatedStudyData);

      const response = await request(app)
        .post('/api/study/response')
        .send(responseData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        nextReview: mockUpdatedStudyData.nextReview.toISOString(),
        interval: mockUpdatedStudyData.interval
      });

      expect(SRSService.calculateNextReview).toHaveBeenCalledWith(mockCurrentStudyData, 0);
    });

    it('should return 404 if study data not found', async () => {
      mockPrisma.studyData.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/study/response')
        .send({ cardId: 'card1', quality: 1 })
        .expect(404);

      expect(response.body).toEqual({ error: 'Study data not found' });
    });

    it('should handle database errors', async () => {
      mockPrisma.studyData.findUnique.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/study/response')
        .send({ cardId: 'card1', quality: 1 })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to submit study response' });
    });

    it('should handle missing cardId', async () => {
      const response = await request(app)
        .post('/api/study/response')
        .send({ quality: 1 })
        .expect(404);

      expect(response.body).toEqual({ error: 'Study data not found' });
    });

    it('should handle missing quality', async () => {
      const response = await request(app)
        .post('/api/study/response')
        .send({ cardId: 'card1' })
        .expect(404);

      expect(response.body).toEqual({ error: 'Study data not found' });
    });
  });

  describe('GET /api/study/stats/:deckId - getStudyStats', () => {
    it('should return study statistics for a specific deck', async () => {
      const mockStudyData = [
        {
          id: 'study1',
          userId: 'user123',
          cardId: 'card1',
          easeFactor: 2.5,
          interval: 1,
          nextReview: new Date(Date.now() - 86400000), // Yesterday (due)
          repetitions: 1,
          lastReviewed: new Date(),
          card: {
            id: 'card1',
            deckId: 'deck1',
            deck: {
              id: 'deck1',
              title: 'Spanish Verbs'
            }
          }
        },
        {
          id: 'study2',
          userId: 'user123',
          cardId: 'card2',
          easeFactor: 2.6,
          interval: 6,
          nextReview: new Date(Date.now() + 86400000), // Tomorrow (not due)
          repetitions: 2,
          lastReviewed: new Date(),
          card: {
            id: 'card2',
            deckId: 'deck1',
            deck: {
              id: 'deck1',
              title: 'Spanish Verbs'
            }
          }
        },
        {
          id: 'study3',
          userId: 'user123',
          cardId: 'card3',
          easeFactor: 2.4,
          interval: 1,
          nextReview: new Date(Date.now() + 86400000), // Tomorrow (not due)
          repetitions: 0,
          lastReviewed: null,
          card: {
            id: 'card3',
            deckId: 'deck1',
            deck: {
              id: 'deck1',
              title: 'Spanish Verbs'
            }
          }
        }
      ];

      mockPrisma.studyData.findMany.mockResolvedValue(mockStudyData);

      const response = await request(app)
        .get('/api/study/stats/deck1')
        .expect(200);

      expect(response.body).toEqual({
        totalCards: 3,
        dueCards: 1,
        reviewedToday: 2,
        averageEaseFactor: 2.5
      });

      expect(mockPrisma.studyData.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
          card: {
            deckId: 'deck1'
          }
        },
        include: {
          card: {
            include: {
              deck: true
            }
          }
        }
      });
    });

    it('should return study statistics for all decks when no deckId provided', async () => {
      const mockStudyData = [
        {
          id: 'study1',
          userId: 'user123',
          cardId: 'card1',
          easeFactor: 2.5,
          interval: 1,
          nextReview: new Date(Date.now() - 86400000), // Yesterday (due)
          repetitions: 1,
          lastReviewed: new Date(),
          card: {
            id: 'card1',
            deckId: 'deck1',
            deck: {
              id: 'deck1',
              title: 'Spanish Verbs'
            }
          }
        },
        {
          id: 'study2',
          userId: 'user123',
          cardId: 'card2',
          easeFactor: 2.7,
          interval: 6,
          nextReview: new Date(Date.now() + 86400000), // Tomorrow (not due)
          repetitions: 2,
          lastReviewed: new Date(),
          card: {
            id: 'card2',
            deckId: 'deck2',
            deck: {
              id: 'deck2',
              title: 'French Vocabulary'
            }
          }
        }
      ];

      mockPrisma.studyData.findMany.mockResolvedValue(mockStudyData);

      const response = await request(app)
        .get('/api/study/stats')
        .expect(200);

      expect(response.body).toEqual({
        totalCards: 2,
        dueCards: 1,
        reviewedToday: 2,
        averageEaseFactor: 2.6
      });

      expect(mockPrisma.studyData.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123'
        },
        include: {
          card: {
            include: {
              deck: true
            }
          }
        }
      });
    });

    it('should return zero stats when no study data exists', async () => {
      mockPrisma.studyData.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/study/stats/deck1')
        .expect(200);

      expect(response.body).toEqual({
        totalCards: 0,
        dueCards: 0,
        reviewedToday: 0,
        averageEaseFactor: 0
      });
    });

    it('should handle study data with no lastReviewed date', async () => {
      const mockStudyData = [
        {
          id: 'study1',
          userId: 'user123',
          cardId: 'card1',
          easeFactor: 2.5,
          interval: 1,
          nextReview: new Date(Date.now() - 86400000), // Yesterday (due)
          repetitions: 0,
          lastReviewed: null,
          card: {
            id: 'card1',
            deckId: 'deck1',
            deck: {
              id: 'deck1',
              title: 'Spanish Verbs'
            }
          }
        }
      ];

      mockPrisma.studyData.findMany.mockResolvedValue(mockStudyData);

      const response = await request(app)
        .get('/api/study/stats/deck1')
        .expect(200);

      expect(response.body).toEqual({
        totalCards: 1,
        dueCards: 1,
        reviewedToday: 0,
        averageEaseFactor: 2.5
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.studyData.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/study/stats/deck1')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to get study statistics' });
    });

    it('should correctly identify cards reviewed today', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);
      const tomorrow = new Date(today.getTime() + 86400000);

      const mockStudyData = [
        {
          id: 'study1',
          userId: 'user123',
          cardId: 'card1',
          easeFactor: 2.5,
          interval: 1,
          nextReview: tomorrow,
          repetitions: 1,
          lastReviewed: today, // Reviewed today
          card: {
            id: 'card1',
            deckId: 'deck1',
            deck: { id: 'deck1', title: 'Spanish Verbs' }
          }
        },
        {
          id: 'study2',
          userId: 'user123',
          cardId: 'card2',
          easeFactor: 2.6,
          interval: 6,
          nextReview: tomorrow,
          repetitions: 2,
          lastReviewed: yesterday, // Reviewed yesterday
          card: {
            id: 'card2',
            deckId: 'deck1',
            deck: { id: 'deck1', title: 'Spanish Verbs' }
          }
        }
      ];

      mockPrisma.studyData.findMany.mockResolvedValue(mockStudyData);

      const response = await request(app)
        .get('/api/study/stats/deck1')
        .expect(200);

      expect(response.body).toEqual({
        totalCards: 2,
        dueCards: 0,
        reviewedToday: 1,
        averageEaseFactor: 2.55
      });
    });
  });
});