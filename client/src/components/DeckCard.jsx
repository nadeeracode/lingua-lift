import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Edit2, Trash2, Play, Eye } from 'lucide-react';

const DeckCard = ({ deck, onEdit, onDelete, onStudy }) => {
  const navigate = useNavigate();

  const handleViewCards = () => {
    navigate(`/deck/${deck.id}`);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete();
  };

  const handleStudy = (e) => {
    e.stopPropagation();
    onStudy();
  };

  const cardCount = deck._count?.cards || 0;

  return (
    <div className="deck-card" onClick={handleViewCards}>
      <div className="deck-card-header">
        <div className="deck-icon">
          <BookOpen size={24} />
        </div>
        <div className="deck-actions">
          <button
            onClick={handleEdit}
            className="deck-action-btn edit"
            title="Edit deck"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={handleDelete}
            className="deck-action-btn delete"
            title="Delete deck"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="deck-card-content">
        <h4 className="deck-title">{deck.title}</h4>
        {deck.description && (
          <p className="deck-description">{deck.description}</p>
        )}
        
        <div className="deck-stats">
          <span className="card-count">
            {cardCount} {cardCount === 1 ? 'card' : 'cards'}
          </span>
        </div>
      </div>

      <div className="deck-card-footer">
        <button
          onClick={handleViewCards}
          className="view-cards-btn secondary"
        >
          <Eye size={16} />
          View Cards
        </button>
        <button
          onClick={handleStudy}
          className="study-btn primary"
          disabled={cardCount === 0}
        >
          <Play size={16} />
          Study
        </button>
      </div>
    </div>
  );
};

export default DeckCard;