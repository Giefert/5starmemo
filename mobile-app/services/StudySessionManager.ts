import { StudyCardData, StudySession, ReviewInput } from '../types/shared';
import apiService from './api';

export interface StudySessionState {
  session: StudySession | null;
  cards: StudyCardData[];
  currentCardIndex: number;
  studiedCount: number;
  correctCount: number;
  isComplete: boolean;
  deckTitle?: string;
}

export class StudySessionManager {
  private state: StudySessionState;
  
  constructor() {
    this.state = {
      session: null,
      cards: [],
      currentCardIndex: 0,
      studiedCount: 0,
      correctCount: 0,
      isComplete: false,
      deckTitle: undefined
    };
  }

  /**
   * Start a new study session
   */
  async startSession(deckId: string, deckTitle?: string): Promise<StudyCardData[]> {
    try {
      // Create study session
      this.state.session = await apiService.createStudySession(deckId);

      // Get cards for study
      const studyData = await apiService.getDeckForStudy(deckId);
      this.state.cards = studyData.cards;

      // Reset state
      this.state.currentCardIndex = 0;
      this.state.studiedCount = 0;
      this.state.correctCount = 0;
      this.state.isComplete = false;
      this.state.deckTitle = deckTitle;

      return this.state.cards;
    } catch (error) {
      throw new Error(`Failed to start study session: ${error}`);
    }
  }

  /**
   * Submit a rating for the current card
   */
  async submitRating(rating: 1 | 2 | 3 | 4): Promise<void> {
    if (!this.state.session || this.state.isComplete) {
      throw new Error('No active study session');
    }

    const currentCard = this.getCurrentCard();
    if (!currentCard) {
      throw new Error('No current card to rate');
    }

    try {
      const reviewInput: ReviewInput = {
        cardId: currentCard.card.id,
        rating
      };

      await apiService.submitReview(reviewInput, this.state.session.id);
      
      // Update local state
      this.state.studiedCount++;
      if (rating >= 3) { // Good or Easy
        this.state.correctCount++;
      }
      
      // Move to next card or complete session
      this.state.currentCardIndex++;
      if (this.state.currentCardIndex >= this.state.cards.length) {
        await this.completeSession();
      }
    } catch (error) {
      throw new Error(`Failed to submit rating: ${error}`);
    }
  }

  /**
   * Complete the current study session
   */
  private async completeSession(): Promise<void> {
    if (!this.state.session) return;

    const averageRating = this.calculateAverageRating();
    
    await apiService.endStudySession(this.state.session.id, {
      cardsStudied: this.state.studiedCount,
      correctAnswers: this.state.correctCount,
      averageRating
    });

    this.state.isComplete = true;
  }

  /**
   * Calculate average rating based on correct answers
   * This is a simple approximation since we're not tracking individual ratings
   */
  private calculateAverageRating(): number {
    if (this.state.studiedCount === 0) return 0;
    
    const successRate = this.state.correctCount / this.state.studiedCount;
    
    // Map success rate to FSRS rating scale (1-4)
    if (successRate >= 0.9) return 4; // Easy
    if (successRate >= 0.7) return 3; // Good
    if (successRate >= 0.5) return 2; // Hard
    return 1; // Again
  }

  /**
   * Get current card being studied
   */
  getCurrentCard(): StudyCardData | null {
    if (this.state.currentCardIndex >= this.state.cards.length) {
      return null;
    }
    return this.state.cards[this.state.currentCardIndex];
  }

  /**
   * Get current session state
   */
  getState(): StudySessionState {
    return { ...this.state };
  }

  /**
   * Get progress information
   */
  getProgress(): {
    current: number;
    total: number;
    studied: number;
    correct: number;
    percentage: number;
  } {
    return {
      current: this.state.currentCardIndex + 1,
      total: this.state.cards.length,
      studied: this.state.studiedCount,
      correct: this.state.correctCount,
      percentage: this.state.cards.length > 0 
        ? Math.round((this.state.studiedCount / this.state.cards.length) * 100) 
        : 0
    };
  }

  /**
   * Check if session is complete
   */
  isSessionComplete(): boolean {
    return this.state.isComplete;
  }

  /**
   * Reset the session
   */
  reset(): void {
    this.state = {
      session: null,
      cards: [],
      currentCardIndex: 0,
      studiedCount: 0,
      correctCount: 0,
      isComplete: false,
      deckTitle: undefined
    };
  }
}

// Export a singleton instance
export const studySessionManager = new StudySessionManager();