import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CardForm = ({ card, onSubmit, onCancel, title }) => {
  const [formData, setFormData] = useState({
    front: '',
    back: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (card) {
      setFormData({
        front: card.front || '',
        back: card.back || ''
      });
    }
  }, [card]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.front.trim()) {
      newErrors.front = 'Front side is required';
    }

    if (!formData.back.trim()) {
      newErrors.back = 'Back side is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        front: formData.front.trim(),
        back: formData.back.trim()
      });
    } catch (error) {
      console.error('Error submitting card:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button onClick={onCancel} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="card-form">
          <div className="form-group">
            <label htmlFor="front" className="form-label">
              Front Side <span className="required">*</span>
            </label>
            <textarea
              id="front"
              name="front"
              value={formData.front}
              onChange={handleChange}
              className={`form-textarea ${errors.front ? 'error' : ''}`}
              placeholder="Enter the front of the flashcard (e.g., 'Hola')"
              rows={3}
              disabled={isSubmitting}
            />
            {errors.front && <div className="form-error">{errors.front}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="back" className="form-label">
              Back Side <span className="required">*</span>
            </label>
            <textarea
              id="back"
              name="back"
              value={formData.back}
              onChange={handleChange}
              className={`form-textarea ${errors.back ? 'error' : ''}`}
              placeholder="Enter the back of the flashcard (e.g., 'Hello')"
              rows={3}
              disabled={isSubmitting}
            />
            {errors.back && <div className="form-error">{errors.back}</div>}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (card ? 'Update Card' : 'Create Card')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CardForm;