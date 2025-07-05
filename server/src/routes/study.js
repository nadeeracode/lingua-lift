const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const studyController = require('../controllers/studyController');

const router = express.Router();
const prisma = new PrismaClient();

// Get cards for study session
router.get('/deck/:deckId', authenticate, async (req, res) => {
  try {
    const { deckId } = req.params;
    const userId = req.user.id;

    // Verify deck belongs to user
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: userId
      }
    });

    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    // Get all cards in the deck with their study data
    const cards = await prisma.card.findMany({
      where: {
        deckId: deckId
      },
      include: {
        studyData: {
          where: {
            userId: userId
          }
        }
      }
    });

    // Filter cards that are due for review
    const now = new Date();
    const dueCards = cards.filter(card => {
      if (card.studyData.length === 0) {
        // New card - always due
        return true;
      }
      const studyData = card.studyData[0];
      return new Date(studyData.nextReview) <= now;
    });

    // If no cards are due, return all cards (for practice mode)
    const cardsToStudy = dueCards.length > 0 ? dueCards : cards;

    // Shuffle the cards
    const shuffledCards = cardsToStudy.sort(() => Math.random() - 0.5);

    res.json({
      deck: {
        id: deck.id,
        title: deck.title,
        description: deck.description
      },
      cards: shuffledCards.map(card => ({
        id: card.id,
        front: card.front,
        back: card.back,
        isNew: card.studyData.length === 0,
        studyData: card.studyData[0] || null
      })),
      totalCards: cards.length,
      dueCards: dueCards.length
    });

  } catch (error) {
    console.error('Error fetching study cards:', error);
    res.status(500).json({ message: 'Failed to fetch study cards' });
  }
});

// Submit card review
router.post('/review', authenticate, async (req, res) => {
  try {
    const { cardId, quality } = req.body; // quality: 'correct' or 'incorrect'
    const userId = req.user.id;

    // Verify card exists and user has access
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        deck: {
          userId: userId
        }
      }
    });

    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Get or create study data
    let studyData = await prisma.studyData.findUnique({
      where: {
        userId_cardId: {
          userId: userId,
          cardId: cardId
        }
      }
    });

    const now = new Date();

    if (!studyData) {
      // Create new study data
      const interval = quality === 'correct' ? 1 : 0;
      const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

      studyData = await prisma.studyData.create({
        data: {
          userId: userId,
          cardId: cardId,
          easeFactor: quality === 'correct' ? 2.5 : 2.0,
          interval: interval,
          nextReview: nextReview,
          lastReviewed: now,
          repetitions: quality === 'correct' ? 1 : 0
        }
      });
    } else {
      // Update existing study data using spaced repetition algorithm
      let { easeFactor, interval, repetitions } = studyData;

      if (quality === 'correct') {
        repetitions += 1;
        
        if (repetitions === 1) {
          interval = 1;
        } else if (repetitions === 2) {
          interval = 6;
        } else {
          interval = Math.round(interval * easeFactor);
        }

        // Adjust ease factor
        easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02)));
      } else {
        // Incorrect response
        repetitions = 0;
        interval = 1;
        easeFactor = Math.max(1.3, easeFactor - 0.2);
      }

      const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

      studyData = await prisma.studyData.update({
        where: {
          id: studyData.id
        },
        data: {
          easeFactor: easeFactor,
          interval: interval,
          nextReview: nextReview,
          lastReviewed: now,
          repetitions: repetitions
        }
      });
    }

    res.json({
      message: 'Review recorded successfully',
      studyData: {
        interval: studyData.interval,
        nextReview: studyData.nextReview,
        repetitions: studyData.repetitions
      }
    });

  } catch (error) {
    console.error('Error recording review:', error);
    res.status(500).json({ message: 'Failed to record review' });
  }
});

router.get('/deck/:deckId/cards', authenticate, studyController.getStudyCards);
router.post('/response', authenticate, studyController.submitStudyResponse);
router.get('/stats', authenticate, studyController.getStudyStats);
router.get('/stats/:deckId', authenticate, studyController.getStudyStats);

module.exports = router;