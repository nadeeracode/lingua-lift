import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, BookOpen, Play } from 'lucide-react';
import { cardService } from '../services/cardService';
import { deckService } from '../services/deckService';
import FlashCard from '../components/FlashCard';
import CardForm from '../components/CardForm';

const DeckView = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  useEffect(() => {
    fetchDeckAndCards();
  }, [deckId]);

  const fetchDeckAndCards = async () => {
    try {
      setLoading(true);
      const [deckData, cardsData] = await Promise.all([
        deckService.getDeck(deckId),
        cardService.getCards(deckId)
      ]);
      
      setDeck(deckData);
      setCards(cardsData);
      setError('');
    } catch (err) {
      setError(err.message);
      if (err.message.includes('not found')) {
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async (cardData) => {
    try {
      const newCard = await cardService.createCard(deckId, cardData);
      setCards([...cards, newCard]);
      setShowCreateForm(false);
      setError('');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateCard = async (cardData) => {
    try {
      const updatedCard = await cardService.updateCard(deckId, editingCard.id, cardData);
      setCards(cards.map(card => card.id === editingCard.id ? updatedCard : card));
      setEditingCard(null);
      setError('');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteCard = async (cardId) => {
    try {
      await cardService.deleteCard(deckId, cardId);
      setCards(cards.filter(card => card.id !== cardId));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartStudy = () => {
    // TODO: Navigate to study mode
    console.log('Starting study session for deck:', deckId);
  };

  if (loading) {
    return (
      <div className="deck-view-loading">
        <div className="spinner"></div>
        <p>Loading deck...</p>
      </div>
    );
  }

  if (error && !deck) {
    return (
      <div className="deck-view-error">
        <div className="error-content">
          <h2>Error Loading Deck</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="deck-view">
      {/* Header */}
      <div className="deck-view-header">
        <div className="header-container">
          <div className="header-navigation">
            <button onClick={() => navigate('/dashboard')} className="back-btn">
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
          </div>
          
          <div className="deck-info">
            <h1 className="deck-title">{deck?.title}</h1>
            {deck?.description && (
              <p className="deck-description">{deck.description}</p>
            )}
          </div>

          <div className="deck-stats">
            <div className="stat-item">
              <BookOpen size={20} />
              <span>{cards.length} cards</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="actions-bar">
        <div className="actions-container">
          <div className="primary-actions">
            <button 
              onClick={handleStartStudy} 
              className="study-btn"
              disabled={cards.length === 0}
            >
              <Play size={18} />
              Start Study Session
            </button>
          </div>
          
          <div className="secondary-actions">
            <button onClick={() => setShowCreateForm(true)} className="add-card-btn">
              <Plus size={18} />
              Add Card
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="deck-content">
        {error && (
          <div className="error-alert">
            {error}
          </div>
        )}

        {cards.length === 0 ? (
          <div className="empty-cards-state">
            <BookOpen size={64} className="empty-icon" />
            <h3 className="empty-title">No cards yet</h3>
            <p className="empty-description">
              Add your first flashcard to start learning!
            </p>
            <button onClick={() => setShowCreateForm(true)} className="empty-action">
              Add Your First Card
            </button>
          </div>
        ) : (
          <div className="cards-grid">
            {cards.map((card) => (
              <FlashCard
                key={card.id}
                card={card}
                onEdit={setEditingCard}
                onDelete={handleDeleteCard}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateForm && (
        <CardForm
          onSubmit={handleCreateCard}
          onCancel={() => setShowCreateForm(false)}
          title="Add New Card"
        />
      )}

      {editingCard && (
        <CardForm
          card={editingCard}
          onSubmit={handleUpdateCard}
          onCancel={() => setEditingCard(null)}
          title="Edit Card"
        />
      )}
    </div>
  );
};

export default DeckView;