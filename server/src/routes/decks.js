const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { getAllDecks, getDeck, createDeck, updateDeck, deleteDeck } = require('../controllers/deckcontroller')

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/decks - Get all decks for authenticated user
router.get('/', authenticate, getAllDecks);

// GET /api/decks/:id - Get a specific deck
router.get('/:id', authenticate, getDeck)

// POST /api/decks - Create a new deck
router.post('/', authenticate, createDeck);

// PUT /api/decks/:id - Update a deck
router.put('/:id', authenticate, updateDeck);

// DELETE /api/decks/:id - Delete a deck
router.delete('/:id', authenticate, deleteDeck)

module.exports = router;