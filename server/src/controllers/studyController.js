const { PrismaClient } = require('@prisma/client');
const { SRSService } = require('../utils/srsService');

const prisma = new PrismaClient();

// Get cards for study session
getStudyCards = async (req, res) => {
  try {
    const { deckId } = req.params;
    const userId = req.user.id;
    
    // Get all cards in the deck with their study data
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: userId
      },
      include: {
        cards: {
          include: {
            studyData: {
              where: {
                userId: userId
              }
            }
          }
        }
      }
    });
    
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    // Process cards and their study data
    const cardsWithStudyData = await Promise.all(
      deck.cards.map(async (card) => {
        let studyData = card.studyData[0];
        
        // Create initial study data if it doesn't exist
        if (!studyData) {
          studyData = await prisma.studyData.create({
            data: {
              userId: userId,
              cardId: card.id,
              easeFactor: 2.5,
              interval: 1,
              nextReview: new Date(),
              repetitions: 0
            }
          });
        }
        
        return {
          ...card,
          studyData: studyData
        };
      })
    );
    
    // Filter cards that are due for review
    const dueCards = SRSService.getCardsForReview(
      cardsWithStudyData.map(card => card.studyData)
    );
    
    const dueCardsData = cardsWithStudyData.filter(card => 
      dueCards.some(dueCard => dueCard.cardId === card.id)
    );
    
    // If no cards are due, return a limited set of cards (new learning)
    const cardsToStudy = dueCardsData.length > 0 
      ? dueCardsData 
      : cardsWithStudyData.slice(0, 10); // Limit to 10 new cards
    
    res.json({
      cards: cardsToStudy,
      totalCards: deck.cards.length,
      dueCards: dueCardsData.length,
      newCards: cardsWithStudyData.length - dueCardsData.length
    });
    
  } catch (error) {
    console.error('Error getting study cards:', error);
    res.status(500).json({ error: 'Failed to get study cards' });
  }
};

// Submit study response and update SRS data
submitStudyResponse = async (req, res) => {
  try {
    const { cardId, quality } = req.body; // quality: 0 (hard) or 1 (easy)
    const userId = req.user.id;
    
    // Get current study data
    const currentStudyData = await prisma.studyData.findUnique({
      where: {
        userId_cardId: {
          userId: userId,
          cardId: cardId
        }
      }
    });
    
    if (!currentStudyData) {
      return res.status(404).json({ error: 'Study data not found' });
    }
    
    // Calculate next review using SRS algorithm
    const nextReviewData = SRSService.calculateNextReview(currentStudyData, quality);
    
    // Update study data
    const updatedStudyData = await prisma.studyData.update({
      where: {
        userId_cardId: {
          userId: userId,
          cardId: cardId
        }
      },
      data: nextReviewData
    });
    
    res.json({
      success: true,
      nextReview: updatedStudyData.nextReview,
      interval: updatedStudyData.interval
    });
    
  } catch (error) {
    console.error('Error submitting study response:', error);
    res.status(500).json({ error: 'Failed to submit study response' });
  }
};

// Get study statistics
getStudyStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deckId } = req.params;
    
    const studyData = await prisma.studyData.findMany({
      where: {
        userId: userId,
        ...(deckId && {
          card: {
            deckId: deckId
          }
        })
      },
      include: {
        card: {
          include: {
            deck: true
          }
        }
      }
    });
    const now = new Date();
    const dueCards = studyData.filter(data => new Date(data.nextReview) <= now);
    const reviewedToday = studyData.filter(data => {
      if (!data.lastReviewed) return false;
      const today = new Date();
      const reviewDate = new Date(data.lastReviewed);
      return today.toDateString() === reviewDate.toDateString();
    });
    
    const stats = {
      totalCards: studyData.length,
      dueCards: dueCards.length,
      reviewedToday: reviewedToday.length,
      averageEaseFactor: studyData.length > 0 
        ? studyData.reduce((sum, data) => sum + data.easeFactor, 0) / studyData.length 
        : 0
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('Error getting study stats:', error);
    res.status(500).json({ error: 'Failed to get study statistics' });
  }
};

module.exports = {
  getStudyCards,
  submitStudyResponse,
  getStudyStats
};