// Updated Dashboard.jsx with SRS Integration

import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, User, LogOut, Calendar, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { deckService } from '../services/deckService';
import { studyService } from '../services/studyService'; // Add this import
import DeckCard from '../components/DeckCard';
import DeckForm from '../components/DeckForm';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDeck, setEditingDeck] = useState(null);
  const [studyStats, setStudyStats] = useState(null); // Add this state

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Combined function to load both decks and study stats
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load decks and study stats in parallel
      const [decksData, statsData] = await Promise.all([
        deckService.getDecks(),
        studyService.getStudyStats().catch(err => {
          console.error('Error loading study stats:', err);
          return null; // Return null if stats fail to load
        })
      ]);
      setDecks(decksData);
      setStudyStats(statsData);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update fetchDecks to also refresh study stats
  const fetchDecks = async () => {
    await loadDashboardData();
  };

  const handleCreateDeck = async (deckData) => {
    try {
      const newDeck = await deckService.createDeck(deckData);
      setDecks([newDeck, ...decks]);
      setShowCreateForm(false);
      setError('');
      
      // Refresh study stats after creating a deck
      const statsData = await studyService.getStudyStats().catch(() => null);
      setStudyStats(statsData);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateDeck = async (id, deckData) => {
    try {
      const updatedDeck = await deckService.updateDeck(id, deckData);
      setDecks(decks.map(deck => deck.id === id ? updatedDeck : deck));
      setEditingDeck(null);
      setError('');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteDeck = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deck? This action cannot be undone.')) {
      return;
    }

    try {
      await deckService.deleteDeck(id);
      setDecks(decks.filter(deck => deck.id !== id));
      setError('');
      
      // Refresh study stats after deleting a deck
      const statsData = await studyService.getStudyStats().catch(() => null);
      setStudyStats(statsData);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStudy = (deck) => {
    // Check if deck has cards
    if (!deck._count?.cards || deck._count.cards === 0) {
      alert('This deck has no cards to study. Please add some cards first.');
      return;
    }
   
    // Navigate to study mode
    navigate(`/study/${deck.id}`);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-container">
          <div className="header-content">
            <div className="logo">
              <h1>LinguaLift</h1>
            </div>
            <div className="header-actions">
              <div className="user-info">
                <User size={20} />
                <span className="user-email">{user?.email}</span>
              </div>
              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={18} />
                <span className="logout-text">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h2 className="welcome-title">
            Welcome back, {user?.email?.split('@')[0]}!
          </h2>
          <p className="welcome-subtitle">
            Ready to continue your language learning journey?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <BookOpen className="stat-icon blue" />
              <div className="stat-info">
                <h3>Total Decks</h3>
                <p className="stat-value blue">{decks.length}</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-icon-circle green">
                <span>📚</span>
              </div>
              <div className="stat-info">
                <h3>Total Cards</h3>
                <p className="stat-value green">
                  {decks.reduce((total, deck) => total + (deck._count?.cards || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <Calendar className="stat-icon orange" />
              <div className="stat-info">
                <h3>Due for Review</h3>
                <p className="stat-value orange">
                  {studyStats?.dueCards || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <Brain className="stat-icon purple" />
              <div className="stat-info">
                <h3>Reviewed Today</h3>
                <p className="stat-value purple">
                  {studyStats?.reviewedToday || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Study Summary Section - Add this new section */}
        {studyStats && studyStats.dueCards > 0 && (
          <div className="study-summary-section">
            <div className="study-summary-card">
              <div className="study-summary-content">
                <div className="study-summary-icon">
                  <Brain size={32} />
                </div>
                <div className="study-summary-text">
                  <h3>Ready to Study!</h3>
                  <p>You have {studyStats.dueCards} cards due for review across your decks.</p>
                </div>
                <button 
                  onClick={() => {
                    // Find the first deck with cards and navigate to study
                    const deckWithCards = decks.find(deck => deck._count?.cards > 0);
                    if (deckWithCards) {
                      navigate(`/study/${deckWithCards.id}`);
                    }
                  }}
                  className="study-now-btn"
                >
                  Study Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deck Management Section */}
        <div className="deck-section">
          <div className="deck-header">
            <div className="deck-header-content">
              <h3 className="deck-title">My Decks</h3>
              <button onClick={() => setShowCreateForm(true)} className="create-btn">
                <Plus size={20} />
                Create New Deck
              </button>
            </div>
          </div>

          <div className="deck-content">
            {error && (
              <div className="error-alert">
                {error}
              </div>
            )}

            {loading ? (
              <div className="loading-container">
                <div className="spinner"></div>
              </div>
            ) : decks.length === 0 ? (
              <div className="empty-state">
                <BookOpen size={64} className="empty-icon" />
                <h4 className="empty-title">No decks yet</h4>
                <p className="empty-description">Create your first deck to start learning!</p>
                <button onClick={() => setShowCreateForm(true)} className="empty-action">
                  Create Your First Deck
                </button>
              </div>
            ) : (
              <div className="deck-grid">
                {decks.map((deck) => (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    onEdit={() => setEditingDeck(deck)}
                    onDelete={() => handleDeleteDeck(deck.id)}
                    onStudy={() => handleStudy(deck)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showCreateForm && (
        <DeckForm
          onSubmit={handleCreateDeck}
          onCancel={() => setShowCreateForm(false)}
          title="Create New Deck"
        />
      )}

      {editingDeck && (
        <DeckForm
          deck={editingDeck}
          onSubmit={(data) => handleUpdateDeck(editingDeck.id, data)}
          onCancel={() => setEditingDeck(null)}
          title="Edit Deck"
        />
      )}
    </div>
  );
};

export default Dashboard;