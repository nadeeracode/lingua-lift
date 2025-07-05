import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, CheckCircle, XCircle, Brain } from 'lucide-react';
import { studyService } from '../services/studyService';

import './StudyMode.css';

const StudyMode = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    total: 0
  });
  const [studyData, setStudyData] = useState(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  
  useEffect(() => {
    loadStudySession();
  }, [deckId]);
  
  const loadStudySession = async () => {
    try {
      setLoading(true);
      const data = await studyService.getStudyCards(deckId);
      
      if (data.cards.length === 0) {
        // No cards to study
        setSessionComplete(true);
        setStudyData(data);
      } else {
        setCards(data.cards);
        setStudyData(data);
        setSessionStats(prev => ({ ...prev, total: data.cards.length }));
      }
    } catch (error) {
      console.error('Error loading study session:', error);
      alert('Failed to load study session');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResponse = async (quality) => {
    const currentCard = cards[currentCardIndex];
    
    try {
      await studyService.submitResponse(currentCard.id, quality);
      
      // Update session stats
      setSessionStats(prev => ({
        ...prev,
        [quality >= 0.6 ? 'correct' : 'incorrect']: prev[quality >= 0.6 ? 'correct' : 'incorrect'] + 1
      }));
      
      // Move to next card or complete session
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setIsFlipped(false);
      } else {
        setSessionComplete(true);
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Failed to submit response');
    }
  };
  
  const resetCard = () => {
    setIsFlipped(false);
  };
  
  const goBack = () => {
    navigate('/dashboard');
  };
  
  if (loading) {
    return (
      <div className="study-mode-loading">
        <div className="spinner"></div>
        <p>Loading study session...</p>
      </div>
    );
  }
  
  if (sessionComplete) {
    return (
      <div className="study-complete">
        <div className="study-complete-container">
          <div className="study-complete-header">
            <Brain size={64} className="study-complete-icon" />
            <h2>Study Session Complete!</h2>
            {studyData?.cards?.length === 0 ? (
              <p>No cards are due for review right now. Great job staying on top of your studies!</p>
            ) : (
              <p>You've completed all cards in this session.</p>
            )}
          </div>
          
          <div className="study-stats">
            <div className="stat-item correct">
              <CheckCircle size={24} />
              <span>Correct: {sessionStats.correct}</span>
            </div>
            <div className="stat-item incorrect">
              <XCircle size={24} />
              <span>Incorrect: {sessionStats.incorrect}</span>
            </div>
            <div className="stat-item total">
              <Brain size={24} />
              <span>Total: {sessionStats.total}</span>
            </div>
          </div>
          
          {studyData && (
            <div className="study-summary">
              <h3>Study Summary</h3>
              <p>Total cards in deck: {studyData.totalCards}</p>
              <p>Cards due for review: {studyData.dueCards}</p>
              <p>New cards: {studyData.newCards}</p>
            </div>
          )}
          
          <div className="study-complete-actions">
            <button onClick={goBack} className="back-to-dashboard">
              Back to Dashboard
            </button>
            <button onClick={loadStudySession} className="study-again">
              Study Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  const currentCard = cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / cards.length) * 100;
  
  return (
    <div className="study-mode">
      {/* Header */}
      <div className="study-header">
        <button onClick={goBack} className="back-button">
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="study-progress">
          <span>{currentCardIndex + 1} / {cards.length}</span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <div className="session-stats">
          <span className="correct-count">✓ {sessionStats.correct}</span>
          <span className="incorrect-count">✗ {sessionStats.incorrect}</span>
        </div>
      </div>
      
      {/* Flashcard */}
      <div className="flashcard-container">
        <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
          <div className="flashcard-front">
            <div className="card-content">
              <h3>Question</h3>
              <p>{currentCard.front}</p>
            </div>
            <button 
              onClick={() => setIsFlipped(true)} 
              className="flip-button"
            >
              Show Answer
            </button>
          </div>
          
          <div className="flashcard-back">
            <div className="card-content">
              <h3>Answer</h3>
              <p>{currentCard.back}</p>
            </div>
            <div className="response-buttons">
              <button 
                onClick={() => handleResponse(0)} 
                className="response-button hard"
              >
                <XCircle size={20} />
                Didn't Know It
              </button>
              <button 
                onClick={() => handleResponse(1)} 
                className="response-button easy"
              >
                <CheckCircle size={20} />
                Knew It Well
              </button>
            </div>
          </div>
        </div>
        
        <button onClick={resetCard} className="reset-button">
          <RotateCcw size={16} />
          Reset Card
        </button>
      </div>
    </div>
  );
};

export default StudyMode;