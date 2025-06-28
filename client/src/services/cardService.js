import api from './api';

class CardService {
  async getCards(deckId) {
    try {
      const response = await api.get(`/decks/${deckId}/cards`);
      return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch cards' };
    }
  }

  async createCard(deckId, cardData) {
    try {
      const response = await api.post(`/decks/${deckId}/cards`, cardData);
      return response.data;
    } catch(error) {
      throw error.response?.data || { message: 'Failed to create cards' };
    }
  }

  async updateCard(deckId, cardId, cardData) {
    try {
      const response = await api.put(`/decks/${deckId}/cards/${cardId}`, cardData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update cards' };
    }
  }

  async deleteCard(deckId, cardId) {
    try {
      const response = await api.delete(`/decks/${deckId}/cards/${cardId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete cards' };
    }
  }
}

export const cardService = new CardService();