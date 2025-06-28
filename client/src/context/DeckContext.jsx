import React, { createContext, useContext, useReducer } from 'react';
import { deckService } from '../services/deckService';

// Initial state
const initialState = {
  decks: [],
  loading: false,
  error: null,
  selectedDeck: null
};

// Action types
const DECK_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_DECKS: 'SET_DECKS',
  ADD_DECK: 'ADD_DECK',
  UPDATE_DECK: 'UPDATE_DECK',
  DELETE_DECK: 'DELETE_DECK',
  SET_SELECTED_DECK: 'SET_SELECTED_DECK'
};

// Reducer
const deckReducer = (state, action) => {
  switch (action.type) {
    case DECK_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case DECK_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case DECK_ACTIONS.SET_DECKS:
      return { ...state, decks: action.payload, loading: false, error: null };
    
    case DECK_ACTIONS.ADD_DECK:
      return { 
        ...state, 
        decks: [action.payload, ...state.decks], 
        loading: false, 
        error: null 
      };
    
    case DECK_ACTIONS.UPDATE_DECK:
      return {
        ...state,
        decks: state.decks.map(deck => 
          deck.id === action.payload.id ? action.payload : deck
        ),
        loading: false,
        error: null
      };
    
    case DECK_ACTIONS.DELETE_DECK:
      return {
        ...state,
        decks: state.decks.filter(deck => deck.id !== action.payload),
        loading: false,
        error: null
      };
    
    case DECK_ACTIONS.SET_SELECTED_DECK:
      return { ...state, selectedDeck: action.payload };
    
    default:
      return state;
  }
};

// Create context
const DeckContext = createContext();

// Provider component
export const DeckProvider = ({ children }) => {
  const [state, dispatch] = useReducer(deckReducer, initialState);

  // Actions
  const actions = {
    async fetchDecks() {
      dispatch({ type: DECK_ACTIONS.SET_LOADING, payload: true });
      try {
        const decks = await deckService.getDecks();
        dispatch({ type: DECK_ACTIONS.SET_DECKS, payload: decks });
      } catch (error) {
        dispatch({ type: DECK_ACTIONS.SET_ERROR, payload: error.message });
      }
    },

    async createDeck(deckData) {
      dispatch({ type: DECK_ACTIONS.SET_LOADING, payload: true });
      try {
        const newDeck = await deckService.createDeck(deckData);
        dispatch({ type: DECK_ACTIONS.ADD_DECK, payload: newDeck });
        return newDeck;
      } catch (error) {
        dispatch({ type: DECK_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    async updateDeck(id, deckData) {
      dispatch({ type: DECK_ACTIONS.SET_LOADING, payload: true });
      try {
        const updatedDeck = await deckService.updateDeck(id, deckData);
        dispatch({ type: DECK_ACTIONS.UPDATE_DECK, payload: updatedDeck });
        return updatedDeck;
      } catch (error) {
        dispatch({ type: DECK_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    async deleteDeck(id) {
      dispatch({ type: DECK_ACTIONS.SET_LOADING, payload: true });
      try {
        await deckService.deleteDeck(id);
        dispatch({ type: DECK_ACTIONS.DELETE_DECK, payload: id });
      } catch (error) {
        dispatch({ type: DECK_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      }
    },

    setSelectedDeck(deck) {
      dispatch({ type: DECK_ACTIONS.SET_SELECTED_DECK, payload: deck });
    },

    clearError() {
      dispatch({ type: DECK_ACTIONS.SET_ERROR, payload: null });
    }
  };

  const value = {
    ...state,
    ...actions
  };

  return (
    <DeckContext.Provider value={value}>
      {children}
    </DeckContext.Provider>
  );
};

// Custom hook to use the deck context
export const useDeck = () => {
  const context = useContext(DeckContext);
  if (!context) {
    throw new Error('useDeck must be used within a DeckProvider');
  }
  return context;
};

export default DeckContext;