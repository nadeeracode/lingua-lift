import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const FlashCard = ({ card, onEdit, onDelete }) => {
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      onDelete(card.id);
    }
  };

  return (
    <div className="flashcard">
      <div className="flashcard-content">
        <div className="flashcard-side">
          <div className="flashcard-label">Front</div>
          <div className="flashcard-text">{card.front}</div>
        </div>
        
        <div className="flashcard-divider"></div>
        
        <div className="flashcard-side">
          <div className="flashcard-label">Back</div>
          <div className="flashcard-text">{card.back}</div>
        </div>
      </div>

      <div className="flashcard-actions">
        <button
          onClick={() => onEdit(card)}
          className="action-btn edit"
          title="Edit card"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={handleDelete}
          className="action-btn delete"
          title="Delete card"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default FlashCard;