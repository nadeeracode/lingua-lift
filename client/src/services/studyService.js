import api from './api';

export const studyService = {
    // Get cards for study session
  getStudyCards: async (deckId) => {
    const response = await api.get(`/study/deck/${deckId}/cards`);
    return response.data;
  },
  
  // Submit study response
  submitResponse: async (cardId, quality) => {
    const response = await api.post('/study/response', {
      cardId,
      quality
    });
    return response.data;
  },
  
  // Get study statistics
  getStudyStats: async (deckId = null) => {
    const url = deckId ? `/study/stats/${deckId}` : '/study/stats';
    const response = await api.get(url);
    return response.data;
  }
  // async getStudyCards(deckId) {
  //   try {
  //     const response = await api.get(`/study/deck/${deckId}`);
  //     return response.data;
  //   } catch (error) {
  //     throw new Error(error.response?.data?.message || 'Failed to fetch study cards');
  //   }
  // },

  // async submitReview(cardId, quality) {
  //   try {
  //     const response = await api.post('/study/review', {
  //       cardId,
  //       quality // 'correct' or 'incorrect'
  //     });
  //     return response.data;
  //   } catch (error) {
  //     throw new Error(error.response?.data?.message || 'Failed to submit review');
  //   }
  // },

  // async getStudyStats(deckId) {
  //   try {
  //     const response = await api.get(`/study/stats/${deckId}`);
  //     return response.data;
  //   } catch (error) {
  //     throw new Error(error.response?.data?.message || 'Failed to fetch study stats');
  //   }
  // }
};