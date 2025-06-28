import api from './api';

const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
};

export const deckService = {
  // Get all decks for the authenticated user
  async getDecks() {
    try {
        const response = await api.get(`/decks`);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to get Decks' };
    }
  },
  // Get a specific deck by ID
  async getDeck(id) {
    try {
      const response = await api.get(`/decks/${id}`);
      return response.data;
    } catch (error) {
        throw error.response?.data || { message: `Failed to get Deck ${id}` };
    }
  },

  // Create a new deck
  async createDeck(deckData) {
    try {
      const response = await api.post(`/decks`, deckData);
      return response.data;
    } catch (error) {
        throw error.response?.data || { message: `Failed to create Deck` };
    }
  },

  // Update an existing deck
  async updateDeck(id, deckData) {
    try {
      const response = await api.put(`/decks/${id}`, deckData);
      return response.data;
    } catch (error) {
        throw error.response?.data || { message: `Failed to Update Deck` };
    }
  },

  // Delete a deck
  async deleteDeck(id) {
    try {
    const response = await api.delete(`decks/${id}`);
      return response.data;
    } catch (error) {
        throw error.response?.data || { message: `Failed to Delete Deck` };
    }
  }
};