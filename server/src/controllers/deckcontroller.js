const prisma = require('../utils/db');

const getAllDecks = async ( req, res ) => {
  try {
    const decks = await prisma.deck.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        _count: {
          select: { cards: true }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    res.json(decks);
  } catch(error) {
    console.error('Error fetching decks:', error);
    res.status(500).json({ error: 'Failed to fetch decks' });
  }
}

const getDeck = async( req, res ) => {
  try {
    const deck = await prisma.deck.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: {
        _count: {
          select: { cards: true }
        }
      }
    });

    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    res.json(deck);
  } catch (error) {
    console.error('Error fetching deck:', error);
    res.status(500).json({ error: 'Failed to fetch deck' });
  }
}

const createDeck = async ( req, res ) => {
  try {
    const { title, description } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Deck title is required' });
    }

    const deck = await prisma.deck.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        userId: req.user.id
      },
      include: {
        _count: {
          select: { cards: true }
        }
      }
    });

    res.status(201).json(deck);
  } catch (error) {
    console.error('Error creating deck:', error);
    res.status(500).json({ error: 'Failed to create deck' });
  }
}

const updateDeck = async ( req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Deck title is required' });
    }

    // Check if deck exists and belongs to user
    const existingDeck = await prisma.deck.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!existingDeck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const updatedDeck = await prisma.deck.update({
      where: {
        id: req.params.id
      },
      data: {
        title: title.trim(),
        description: description ? description.trim() : null
      },
      include: {
        _count: {
          select: { cards: true }
        }
      }
    });

    res.json(updatedDeck);
  } catch (error) {
    console.error('Error updating deck:', error);
    res.status(500).json({ error: 'Failed to update deck' });
  }
}

const deleteDeck = async ( req, res ) => {
  try {
    // Check if deck exists and belongs to user
    const existingDeck = await prisma.deck.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!existingDeck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    await prisma.deck.delete({
      where: {
        id: req.params.id
      }
    });

    res.json({ message: 'Deck deleted successfully' });
  } catch (error) {
    console.error('Error deleting deck:', error);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
}

const getAllCardsInADeck = async (req, res) => {
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

    // Get all cards in the deck
    const cards = await prisma.card.findMany({
    where: {
        deckId: deckId
    },
    orderBy: {
        createdAt: 'desc'
    }
    });

    res.json(cards);
  } catch (error) {
    console.error('Get Cards Error:', error);
    res.status(500).json({ message: 'Failed to get deck cards' });
  }
};

const createCard = async ( req, res ) => {
  try {
    const { deckId } = req.params;
    const { front, back } = req.body;
    const userId = req.user.id;

    // Validation
    if (!front || !back) {
      return res.status(400).json({ message: 'Front and back are required' });
    }

    if (front.trim().length === 0 || back.trim().length === 0) {
      return res.status(400).json({ message: 'Front and back cannot be empty' });
    }

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

    // Create the card
    const card = await prisma.card.create({
      data: {
        front: front.trim(),
        back: back.trim(),
        deckId: deckId
      }
    });

    res.status(201).json(card);
  } catch(error) {
    console.error('Create Cards Error:', error);
    res.status(500).json({ message: 'Failed to create deck cards' });
  }
};

const updateCard = async (req, res ) => {
  try {
    const { deckId, cardId } = req.params;
    const { front, back } = req.body;
    const userId = req.user.id;

    // Validation
    if (!front || !back) {
      return res.status(400).json({ message: 'Front and back are required' });
    }

    if (front.trim().length === 0 || back.trim().length === 0) {
      return res.status(400).json({ message: 'Front and back cannot be empty' });
    }

    // Verify deck belongs to user and card belongs to deck
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: userId
      }
    });

    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    const existingCard = await prisma.card.findFirst({
      where: {
        id: cardId,
        deckId: deckId
      }
    });

    if (!existingCard) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Update the card
    const updatedCard = await prisma.card.update({
      where: {
        id: cardId
      },
      data: {
        front: front.trim(),
        back: back.trim()
      }
    });

    res.json(updatedCard);
  } catch(error) {
    console.error('Update Card Error:', error);
    res.status(500).json({ message: 'Failed to update deck card' });
  }
}

const deleteCard = async ( req, res ) => {
  try {
    const { deckId, cardId } = req.params;
    const userId = req.user.id;

    // Verify deck belongs to user and card belongs to deck
    const deck = await prisma.deck.findFirst({
      where: {
        id: deckId,
        userId: userId
      }
    });

    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    const existingCard = await prisma.card.findFirst({
      where: {
        id: cardId,
        deckId: deckId
      }
    });

    if (!existingCard) {
      return res.status(404).json({ message: 'Card not found' });
    }

    // Delete the card (this will also cascade delete related study data)
    await prisma.card.delete({
      where: {
        id: cardId
      }
    });

    res.json({ message: 'Card deleted successfully' });
  } catch(error) {
    console.error('Delete Card Error:', error);
    res.status(500).json({ message: 'Failed to delete deck card' });
  }
}
module.exports = {
  getAllDecks,
  getDeck,
  createDeck,
  updateDeck,
  deleteDeck,
  getAllCardsInADeck,
  createCard,
  updateCard,
  deleteCard,
};