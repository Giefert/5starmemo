import { StudyCardData, StudySession, ReviewInput, CurationKind, GlossaryTermSummary } from '../types/shared';
import apiService from './api';

export type StudySessionItem =
  | { kind: 'card'; cardData: StudyCardData }
  | { kind: 'reference'; term: GlossaryTermSummary };

export interface StudySessionState {
  session: StudySession | null;
  cards: StudySessionItem[];
  // Indices in `cards` where a new curation unit begins. First unit always
  // starts at 0; subsequent entries are positions of the second, third,
  // ... unit. Empty for deck-tab sessions. Used to draw progress-bar ticks.
  unitStartIndices: number[];
  currentCardIndex: number;
  studiedCount: number;
  correctCount: number;
  isComplete: boolean;
  deckTitle?: string;
}

export type DeckStudyMode = 'recommended' | 'full';

export type StartTarget =
  | { kind: 'deck'; deckId: string; deckTitle?: string; mode?: DeckStudyMode }
  | { kind: 'curation'; curationKind: CurationKind; title: string }
  | { kind: 'custom'; title: string; items: StudySessionItem[] };

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class StudySessionManager {
  private state: StudySessionState;

  constructor() {
    this.state = {
      session: null,
      cards: [],
      unitStartIndices: [],
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
  async startSession(target: StartTarget): Promise<StudySessionItem[]> {
    try {
      if (target.kind === 'deck') {
        const mode = target.mode ?? 'recommended';
        this.state.session = mode === 'full'
          ? null
          : await apiService.createStudySession({ deckId: target.deckId });
        const studyData = await apiService.getDeckForStudy(target.deckId, mode);
        this.state.cards = studyData.cards.map(cardData => ({ kind: 'card', cardData }));
        this.state.unitStartIndices = [];
        this.state.deckTitle = target.deckTitle;
      } else if (target.kind === 'curation') {
        const payload = await apiService.getCurationStudy(target.curationKind);
        const shuffledUnits = shuffle(payload.units);
        const cards: StudySessionItem[] = [];
        const starts: number[] = [];
        for (const unit of shuffledUnits) {
          starts.push(cards.length);
          const unitCards = unit.type === 'deck' ? shuffle(unit.cards) : unit.cards;
          cards.push(...unitCards.map(cardData => ({ kind: 'card' as const, cardData })));
        }
        this.state.session = await apiService.createStudySession({ curationKind: target.curationKind });
        this.state.cards = cards;
        this.state.unitStartIndices = starts;
        this.state.deckTitle = target.title;
      } else {
        this.state.session = null;
        this.state.cards = target.items;
        this.state.unitStartIndices = [];
        this.state.deckTitle = target.title;
      }

      this.state.currentCardIndex = 0;
      this.state.studiedCount = 0;
      this.state.correctCount = 0;
      this.state.isComplete = false;

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
    if (currentCard.kind !== 'card') {
      throw new Error('Current item cannot be rated');
    }

    try {
      const reviewInput: ReviewInput = {
        cardId: currentCard.cardData.card.id,
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
   * Advance to the next card without recording a review. Full-deck sessions
   * browse every card locally, so they have no rating or session log to submit.
   */
  async advance(): Promise<void> {
    if (
      this.state.isComplete ||
      this.state.cards.length === 0 ||
      this.state.currentCardIndex >= this.state.cards.length
    ) {
      throw new Error('No active study session');
    }

    this.state.studiedCount++;
    this.state.currentCardIndex++;
    if (this.state.currentCardIndex >= this.state.cards.length) {
      await this.completeSession();
    }
  }

  /**
   * Complete the current study session
   */
  private async completeSession(): Promise<void> {
    if (!this.state.session) {
      this.state.isComplete = true;
      return;
    }

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
  getCurrentCard(): StudySessionItem | null {
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
    unitStartIndices: number[];
  } {
    return {
      current: this.state.currentCardIndex + 1,
      total: this.state.cards.length,
      studied: this.state.studiedCount,
      correct: this.state.correctCount,
      percentage: this.state.cards.length > 0
        ? Math.round((this.state.studiedCount / this.state.cards.length) * 100)
        : 0,
      unitStartIndices: this.state.unitStartIndices,
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
      unitStartIndices: [],
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
