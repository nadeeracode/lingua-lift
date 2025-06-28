import React, { useState } from 'react';

const DeckForm = ({ deck = null, onSubmit, onCancel, title }) => {
  const [formData, setFormData] = useState({
    title: deck?.title || '',
    description: deck?.description || ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      // Error handling is done in parent component
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-content">
          <h2 className="modal-title">{title}</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label">
                Title <span className="required">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`form-input ${errors.title ? 'error' : ''}`}
                placeholder="e.g., Spanish - Common Verbs"
              />
              {errors.title && (
                <p className="form-error">{errors.title}</p>
              )}
            </div>
            
            <div className="form-field">
              <label className="form-label">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="form-textarea"
                placeholder="Optional description of your deck..."
              />
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                onClick={onCancel}
                className="form-btn form-btn-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="form-btn form-btn-submit"
              >
                {loading ? 'Saving...' : (deck ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DeckForm;