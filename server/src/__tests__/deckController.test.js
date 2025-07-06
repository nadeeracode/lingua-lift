const request = require('supertest');
const app = require('../app');

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

describe.skip('Deck Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/decks - getAllDecks', () => {
    it('should return all decks for authenticated user', async () => {
      const mockDecks = [
        {
          id: 'deck1',
          title: 'Spanish Verbs',
          description: 'Common Spanish verbs',
          userId: 'user123',
          _count: { cards: 10 }
        },
        {
          id: 'deck2',
          title: 'French Vocabulary',
          description: 'Basic French words',
          userId: 'user123',
          _count: { cards: 5 }
        }
      ];

      mockPrisma.deck.findMany.mockResolvedValue(mockDecks);

      const response = await request(app)
        .get('/api/decks')
        .expect(200);

      expect(response.body).toEqual(mockDecks);
      expect(mockPrisma.deck.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        include: {
          _count: {
            select: { cards: true }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.deck.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/decks')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to fetch decks' });
    });
  });

  describe('GET /api/decks/:id - getDeck', () => {
    it('should return a specific deck for authenticated user', async () => {
      const mockDeck = {
        id: 'deck1',
        title: 'Spanish Verbs',
        description: 'Common Spanish verbs',
        userId: 'user123',
        _count: { cards: 10 }
      };

      mockPrisma.deck.findFirst.mockResolvedValue(mockDeck);

      const response = await request(app)
        .get('/api/decks/deck1')
        .expect(200);

      expect(response.body).toEqual(mockDeck);
      expect(mockPrisma.deck.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'deck1',
          userId: 'user123'
        },
        include: {
          _count: {
            select: { cards: true }
          }
        }
      });
    });

    it('should return 404 if deck not found', async () => {
      mockPrisma.deck.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/decks/nonexistent')
        .expect(404);

      expect(response.body).toEqual({ error: 'Deck not found' });
    });

    it('should handle database errors', async () => {
      mockPrisma.deck.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/decks/deck1')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to fetch deck' });
    });
  });

  describe('POST /api/decks - createDeck', () => {
    it('should create a new deck with valid data', async () => {
      const deckData = {
        title: 'German Basics',
        description: 'Basic German vocabulary'
      };

      const mockCreatedDeck = {
        id: 'deck3',
        title: 'German Basics',
        description: 'Basic German vocabulary',
        userId: 'user123',
        _count: { cards: 0 }
      };

      mockPrisma.deck.create.mockResolvedValue(mockCreatedDeck);

      const response = await request(app)
        .post('/api/decks')
        .send(deckData)
        .expect(201);

      expect(response.body).toEqual(mockCreatedDeck);
      expect(mockPrisma.deck.create).toHaveBeenCalledWith({
        data: {
          title: 'German Basics',
          description: 'Basic German vocabulary',
          userId: 'user123'
        },
        include: {
          _count: {
            select: { cards: true }
          }
        }
      });
    });

    it('should create deck without description', async () => {
      const deckData = {
        title: 'Italian Basics'
      };

      const mockCreatedDeck = {
        id: 'deck4',
        title: 'Italian Basics',
        description: null,
        userId: 'user123',
        _count: { cards: 0 }
      };

      mockPrisma.deck.create.mockResolvedValue(mockCreatedDeck);

      const response = await request(app)
        .post('/api/decks')
        .send(deckData)
        .expect(201);

      expect(response.body).toEqual(mockCreatedDeck);
      expect(mockPrisma.deck.create).toHaveBeenCalledWith({
        data: {
          title: 'Italian Basics',
          description: null,
          userId: 'user123'
        },
        include: {
          _count: {
            select: { cards: true }
          }
        }
      });
    });

    it('should return 400 if title is missing', async () => {
      const response = await request(app)
        .post('/api/decks')
        .send({ description: 'Test description' })
        .expect(400);

      expect(response.body).toEqual({ error: 'Deck title is required' });
    });

    it('should return 400 if title is empty string', async () => {
      const response = await request(app)
        .post('/api/decks')
        .send({ title: '   ', description: 'Test description' })
        .expect(400);

      expect(response.body).toEqual({ error: 'Deck title is required' });
    });

    it('should handle database errors', async () => {
      mockPrisma.deck.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/decks')
        .send({ title: 'Test Deck' })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to create deck' });
    });
  });

  describe('PUT /api/decks/:id - updateDeck', () => {
    it('should update an existing deck', async () => {
      const updateData = {
        title: 'Updated Spanish Verbs',
        description: 'Updated description'
      };

      const mockExistingDeck = {
        id: 'deck1',
        title: 'Spanish Verbs',
        userId: 'user123'
      };

      const mockUpdatedDeck = {
        id: 'deck1',
        title: 'Updated Spanish Verbs',
        description: 'Updated description',
        userId: 'user123',
        _count: { cards: 10 }
      };

      mockPrisma.deck.findFirst.mockResolvedValue(mockExistingDeck);
      mockPrisma.deck.update.mockResolvedValue(mockUpdatedDeck);

      const response = await request(app)
        .put('/api/decks/deck1')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(mockUpdatedDeck);
      expect(mockPrisma.deck.update).toHaveBeenCalledWith({
        where: { id: 'deck1' },
        data: {
          title: 'Updated Spanish Verbs',
          description: 'Updated description'
        },
        include: {
          _count: {
            select: { cards: true }
          }
        }
      });
    });

    it('should return 404 if deck not found', async () => {
      mockPrisma.deck.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/decks/nonexistent')
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body).toEqual({ error: 'Deck not found' });
    });

    it('should return 400 if title is missing', async () => {
      const response = await request(app)
        .put('/api/decks/deck1')
        .send({ description: 'New description' })
        .expect(400);

      expect(response.body).toEqual({ error: 'Deck title is required' });
    });

    it('should handle database errors', async () => {
      mockPrisma.deck.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/decks/deck1')
        .send({ title: 'Updated Title' })
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to update deck' });
    });
  });

  describe('DELETE /api/decks/:id - deleteDeck', () => {
    it('should delete an existing deck', async () => {
      const mockExistingDeck = {
        id: 'deck1',
        title: 'Spanish Verbs',
        userId: 'user123'
      };

      mockPrisma.deck.findFirst.mockResolvedValue(mockExistingDeck);
      mockPrisma.deck.delete.mockResolvedValue();

      const response = await request(app)
        .delete('/api/decks/deck1')
        .expect(200);

      expect(response.body).toEqual({ message: 'Deck deleted successfully' });
      expect(mockPrisma.deck.delete).toHaveBeenCalledWith({
        where: { id: 'deck1' }
      });
    });

    it('should return 404 if deck not found', async () => {
      mockPrisma.deck.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/decks/nonexistent')
        .expect(404);

      expect(response.body).toEqual({ error: 'Deck not found' });
    });

    it('should handle database errors', async () => {
      mockPrisma.deck.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/decks/deck1')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to delete deck' });
    });
  });

  describe('GET /api/decks/:deckId/cards - getAllCardsInADeck', () => {
    it('should return all cards in a deck', async () => {
      const mockDeck = {
        id: 'deck1',
        title: 'Spanish Verbs',
        userId: 'user123'
      };

      const mockCards = [
        {
          id: 'card1',
          front: 'Hola',
          back: 'Hello',
          deckId: 'deck1'
        },
        {
          id: 'card2',
          front: 'Gracias',
          back: 'Thank you',
          deckId: 'deck1'
        }
      ];

      mockPrisma.deck.findFirst.mockResolvedValue(mockDeck);
      mockPrisma.card.findMany.mockResolvedValue(mockCards);

      const response = await request(app)
        .get('/api/decks/deck1/cards')
        .expect(200);

      expect(response.body).toEqual(mockCards);
      expect(mockPrisma.card.findMany).toHaveBeenCalledWith({
        where: { deckId: 'deck1' },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should return 404 if deck not found', async () => {
      mockPrisma.deck.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/decks/nonexistent/cards')
        .expect(404);

      expect(response.body).toEqual({ message: 'Deck not found' });
    });

    it('should handle database errors', async () => {
      mockPrisma.deck.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/decks/deck1/cards')
        .expect(500);

      expect(response.body).toEqual({ message: 'Failed to get deck cards' });
    });
  });

  describe('POST /api/decks/:deckId/cards - createCard', () => {
    it('should create a new card in the deck', async () => {
      const cardData = {
        front: 'Adiós',
        back: 'Goodbye'
      };

      const mockDeck = {
        id: 'deck1',
        title: 'Spanish Verbs',
        userId: 'user123'
      };

      const mockCreatedCard = {
        id: 'card3',
        front: 'Adiós',
        back: 'Goodbye',
        deckId: 'deck1'
      };

      mockPrisma.deck.findFirst.mockResolvedValue(mockDeck);
      mockPrisma.card.create.mockResolvedValue(mockCreatedCard);

      const response = await request(app)
        .post('/api/decks/deck1/cards')
        .send(cardData)
        .expect(201);

      expect(response.body).toEqual(mockCreatedCard);
      expect(mockPrisma.card.create).toHaveBeenCalledWith({
        data: {
          front: 'Adiós',
          back: 'Goodbye',
          deckId: 'deck1'
        }
      });
    });

    it('should return 400 if front is missing', async () => {
      const response = await request(app)
        .post('/api/decks/deck1/cards')
        .send({ back: 'Goodbye' })
        .expect(400);

      expect(response.body).toEqual({ message: 'Front and back are required' });
    });

    it('should return 400 if back is missing', async () => {
      const response = await request(app)
        .post('/api/decks/deck1/cards')
        .send({ front: 'Adiós' })
        .expect(400);

      expect(response.body).toEqual({ message: 'Front and back are required' });
    });

    it('should return 400 if front is empty string', async () => {
      const response = await request(app)
        .post('/api/decks/deck1/cards')
        .send({ front: '   ', back: 'Goodbye' })
        .expect(400);

      expect(response.body).toEqual({ message: 'Front and back cannot be empty' });
    });

    it('should return 404 if deck not found', async () => {
      mockPrisma.deck.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/decks/nonexistent/cards')
        .send({ front: 'Adiós', back: 'Goodbye' })
        .expect(404);

      expect(response.body).toEqual({ message: 'Deck not found' });
    });

    it('should handle database errors', async () => {
      mockPrisma.deck.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/decks/deck1/cards')
        .send({ front: 'Adiós', back: 'Goodbye' })
        .expect(500);

      expect(response.body).toEqual({ message: 'Failed to create deck cards' });
    });
  });

  describe('PUT /api/decks/:deckId/cards/:cardId - updateCard', () => {
    it('should update an existing card', async () => {
      const updateData = {
        front: 'Updated front',
        back: 'Updated back'
      };

      const mockDeck = {
        id: 'deck1',
        title: 'Spanish Verbs',
        userId: 'user123'
      };

      const mockExistingCard = {
        id: 'card1',
        front: 'Hola',
        back: 'Hello',
        deckId: 'deck1'
      };

      const mockUpdatedCard = {
        id: 'card1',
        front: 'Updated front',
        back: 'Updated back',
        deckId: 'deck1'
      };

      mockPrisma.deck.findFirst.mockResolvedValue(mockDeck);
      mockPrisma.card.findFirst.mockResolvedValue(mockExistingCard);
      mockPrisma.card.update.mockResolvedValue(mockUpdatedCard);

      const response = await request(app)
        .put('/api/decks/deck1/cards/card1')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(mockUpdatedCard);
      expect(mockPrisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card1' },
        data: {
          front: 'Updated front',
          back: 'Updated back'
        }
      });
    });

    it('should return 404 if deck not found', async () => {
      mockPrisma.deck.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/decks/nonexistent/cards/card1')
        .send({ front: 'Updated front', back: 'Updated back' })
        .expect(404);

      expect(response.body).toEqual({ message: 'Deck not found' });
    });

    it('should return 404 if card not found', async () => {
      const mockDeck = {
        id: 'deck1',
        title: 'Spanish Verbs',
        userId: 'user123'
      };

      mockPrisma.deck.findFirst.mockResolvedValue(mockDeck);
      mockPrisma.card.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/decks/deck1/cards/nonexistent')
        .send({ front: 'Updated front', back: 'Updated back' })
        .expect(404);

      expect(response.body).toEqual({ message: 'Card not found' });
    });

    it('should return 400 if front is missing', async () => {
      const response = await request(app)
        .put('/api/decks/deck1/cards/card1')
        .send({ back: 'Updated back' })
        .expect(400);

      expect(response.body).toEqual({ message: 'Front and back are required' });
    });

    it('should handle database errors', async () => {
      mockPrisma.deck.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/decks/deck1/cards/card1')
        .send({ front: 'Updated front', back: 'Updated back' })
        .expect(500);

      expect(response.body).toEqual({ message: 'Failed to update deck card' });
    });
  });

  describe('DELETE /api/decks/:deckId/cards/:cardId - deleteCard', () => {
    it('should delete an existing card', async () => {
      const mockDeck = {
        id: 'deck1',
        title: 'Spanish Verbs',
        userId: 'user123'
      };

      const mockExistingCard = {
        id: 'card1',
        front: 'Hola',
        back: 'Hello',
        deckId: 'deck1'
      };

      mockPrisma.deck.findFirst.mockResolvedValue(mockDeck);
      mockPrisma.card.findFirst.mockResolvedValue(mockExistingCard);
      mockPrisma.card.delete.mockResolvedValue();

      const response = await request(app)
        .delete('/api/decks/deck1/cards/card1')
        .expect(200);

      expect(response.body).toEqual({ message: 'Card deleted successfully' });
      expect(mockPrisma.card.delete).toHaveBeenCalledWith({
        where: { id: 'card1' }
      });
    });

    it('should return 404 if deck not found', async () => {
      mockPrisma.deck.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/decks/nonexistent/cards/card1')
        .expect(404);

      expect(response.body).toEqual({ message: 'Deck not found' });
    });

    it('should return 404 if card not found', async () => {
      const mockDeck = {
        id: 'deck1',
        title: 'Spanish Verbs',
        userId: 'user123'
      };

      mockPrisma.deck.findFirst.mockResolvedValue(mockDeck);
      mockPrisma.card.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/decks/deck1/cards/nonexistent')
        .expect(404);

      expect(response.body).toEqual({ message: 'Card not found' });
    });

    it('should handle database errors', async () => {
      mockPrisma.deck.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/decks/deck1/cards/card1')
        .expect(500);

      expect(response.body).toEqual({ message: 'Failed to delete deck card' });
    });
  });
});