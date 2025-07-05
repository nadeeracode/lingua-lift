// 1. SRS Algorithm Service (services/srsService.js)
class SRSService {
  // SM-2 Algorithm implementation for spaced repetition
  static calculateNextReview(currentData, quality) {
    // quality: 0-1 (0 = didn't know, 1 = knew it well)
    const { easeFactor, interval, repetitions } = currentData;
    
    let newEaseFactor = easeFactor;
    let newInterval = interval;
    let newRepetitions = repetitions;
    
    if (quality >= 0.6) {
      // Correct response
      newRepetitions += 1;
      
      if (newRepetitions === 1) {
        newInterval = 1;
      } else if (newRepetitions === 2) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * newEaseFactor);
      }
      
      // Adjust ease factor
      newEaseFactor = Math.max(1.3, newEaseFactor + (0.1 - (5 - quality * 5) * (0.08 + (5 - quality * 5) * 0.02)));
    } else {
      // Incorrect response - reset repetitions and set short interval
      newRepetitions = 0;
      newInterval = 1;
    }
    
    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);
    
    return {
      easeFactor: newEaseFactor,
      interval: newInterval,
      repetitions: newRepetitions,
      nextReview,
      lastReviewed: new Date()
    };
  }
  
  static getCardsForReview(studyDataArray) {
    const now = new Date();
    return studyDataArray.filter(data => new Date(data.nextReview) <= now);
  }
}

module.exports = { SRSService };