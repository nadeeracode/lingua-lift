// routes/cards.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { getAllCardsInADeck, createCard, updateCard, deleteCard } = require('../controllers/deckcontroller')

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/decks/:deckId/cards - Get all cards in a deck
router.get('/:deckId/cards', authenticate, getAllCardsInADeck);

// POST /api/decks/:deckId/cards - Create a new card
router.post('/:deckId/cards', authenticate, createCard);

// PUT /api/decks/:deckId/cards/:cardId - Update a card
router.put('/:deckId/cards/:cardId', authenticate, updateCard);

// // DELETE /api/decks/:deckId/cards/:cardId - Delete a card
router.delete('/:deckId/cards/:cardId', authenticate, deleteCard)

module.exports = router;