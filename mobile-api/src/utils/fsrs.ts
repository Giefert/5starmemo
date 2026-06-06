import { FSRSCard } from '../../../shared/types';

// FSRS Algorithm Parameters
const FSRS_PARAMS = {
  requestRetention: 0.9, // Target retention rate
  maximumInterval: 36500, // Maximum interval in days (100 years)
  easyBonus: 1.3,
  hardFactor: 1.2,
  weights: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61]
};

export enum Rating {
  Again = 1,
  Hard = 2, 
  Good = 3,
  Easy = 4
}

export interface ReviewResult {
  difficulty: number;
  stability: number;
  retrievability: number;
  grade: number;
  lapses: number;
  reps: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
  nextReview: Date;
}

export class FSRS {
  private w: number[];

  constructor(weights: number[] = FSRS_PARAMS.weights) {
    this.w = weights;
  }

  /**
   * Calculate next review for a card based on rating
   */
  next(card: FSRSCard, rating: Rating, reviewTime: Date = new Date()): ReviewResult {
    const currentStability = this.positiveNumber(card.stability, 0.1);
    const currentDifficulty = this.clamp(this.positiveNumber(card.difficulty, 1), 1, 10);
    const currentLapses = this.nonNegativeInteger(card.lapses);
    const currentReps = this.nonNegativeInteger(card.reps);
    const elapsedDays = card.lastReview 
      ? Math.max(0, (reviewTime.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const retrievability = card.lastReview 
      ? this.calculateRetrievability(elapsedDays, currentStability)
      : 1;

    let newState = card.state;
    let newLapses = currentLapses;
    let newReps = currentReps + 1;
    let newDifficulty = currentDifficulty;
    let newStability = currentStability;

    // Handle different states and ratings
    switch (card.state) {
      case 'new':
        newState = this.processNewCard(rating);
        newDifficulty = this.initDifficulty(rating);
        newStability = this.initStability(rating);
        break;

      case 'learning':
      case 'relearning':
        const result = this.processLearningCard(card, rating, retrievability);
        newState = result.state;
        newDifficulty = result.difficulty;
        newStability = result.stability;
        if (result.state === 'relearning') {
          newLapses += 1;
        }
        break;

      case 'review':
        if (rating === Rating.Again) {
          newState = 'relearning';
          newLapses += 1;
          newStability = this.forgettingStability(newDifficulty, newStability, retrievability);
        } else {
          newState = 'review';
          newDifficulty = this.nextDifficulty(newDifficulty, rating);
          newStability = this.nextRecallStability(newDifficulty, newStability, retrievability, rating);
        }
        break;
    }

    const difficulty = this.clamp(this.positiveNumber(newDifficulty, 1), 1, 10);
    const stability = this.clamp(this.positiveNumber(newStability, 0.1), 0.1, FSRS_PARAMS.maximumInterval);
    const reviewRetrievability = this.clamp(this.finiteNumber(retrievability, 1), 0, 1);

    // Calculate next review date
    const interval = this.nextInterval(stability);
    const nextReview = new Date(reviewTime.getTime() + interval * 24 * 60 * 60 * 1000);

    return {
      difficulty,
      stability,
      retrievability: reviewRetrievability,
      grade: rating,
      lapses: newLapses,
      reps: newReps,
      state: newState,
      nextReview
    };
  }

  /**
   * Process new card based on rating
   */
  private processNewCard(rating: Rating): 'learning' | 'review' {
    if (rating === Rating.Easy) {
      return 'review';
    }
    return 'learning';
  }

  /**
   * Process learning/relearning card
   */
  private processLearningCard(card: FSRSCard, rating: Rating, retrievability: number): {
    state: 'learning' | 'relearning' | 'review';
    difficulty: number;
    stability: number;
  } {
    if (rating === Rating.Again) {
      return {
        state: card.state === 'learning' ? 'learning' : 'relearning',
        difficulty: card.difficulty,
        stability: this.shortTermStability(card.stability, rating)
      };
    } else if (rating >= Rating.Good) {
      return {
        state: 'review',
        difficulty: this.nextDifficulty(card.difficulty, rating),
        stability: this.shortTermStability(card.stability, rating)
      };
    } else {
      return {
        state: card.state === 'learning' ? 'learning' : 'relearning',
        difficulty: this.nextDifficulty(card.difficulty, rating),
        stability: this.shortTermStability(card.stability, rating)
      };
    }
  }

  /**
   * Calculate initial difficulty for new cards
   */
  private initDifficulty(rating: Rating): number {
    return Math.max(1, Math.min(10, this.w[4] - Math.exp(this.w[5] * (rating - 1)) + 1));
  }

  /**
   * Calculate initial stability for new cards
   */
  private initStability(rating: Rating): number {
    return Math.max(0.1, this.w[rating - 1]);
  }

  /**
   * Calculate next difficulty
   */
  private nextDifficulty(difficulty: number, rating: Rating): number {
    const deltaD = -this.w[6] * (rating - 3);
    return Math.max(1, Math.min(10, difficulty + deltaD));
  }

  /**
   * Calculate stability for short-term learning
   */
  private shortTermStability(stability: number, rating: Rating): number {
    const currentStability = this.positiveNumber(stability, 0.1);
    const multiplierByRating: Record<Rating, number> = {
      [Rating.Again]: 0.5,
      [Rating.Hard]: FSRS_PARAMS.hardFactor,
      [Rating.Good]: 2,
      [Rating.Easy]: 2 * FSRS_PARAMS.easyBonus
    };

    return currentStability * multiplierByRating[rating];
  }

  /**
   * Calculate stability after forgetting
   */
  private forgettingStability(difficulty: number, stability: number, retrievability: number): number {
    return this.w[11] * Math.pow(difficulty, -this.w[12]) * 
           (Math.pow(stability + 1, this.w[13]) - 1) * 
           Math.exp(this.w[14] * (1 - retrievability));
  }

  /**
   * Calculate stability for recall
   */
  private nextRecallStability(difficulty: number, stability: number, retrievability: number, rating: Rating): number {
    const hardPenalty = rating === Rating.Hard ? this.w[15] : 1;
    const easyBonus = rating === Rating.Easy ? this.w[16] : 1;
    
    return stability * (Math.exp(this.w[8]) * 
                       (11 - difficulty) * 
                       Math.pow(stability, -this.w[9]) * 
                       (Math.exp(this.w[10] * (1 - retrievability)) - 1) * 
                       hardPenalty * 
                       easyBonus + 1);
  }

  /**
   * Calculate retrievability based on elapsed time and stability
   */
  private calculateRetrievability(elapsedDays: number, stability: number): number {
    return Math.exp(Math.log(0.9) * elapsedDays / this.positiveNumber(stability, 0.1));
  }

  /**
   * Calculate next interval in days
   */
  private nextInterval(stability: number): number {
    const interval = this.positiveNumber(stability, 0.1) * (Math.log(FSRS_PARAMS.requestRetention) / Math.log(0.9));
    return Math.min(Math.max(1, Math.round(interval)), FSRS_PARAMS.maximumInterval);
  }

  private positiveNumber(value: number, fallback: number): number {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private finiteNumber(value: number, fallback: number): number {
    return Number.isFinite(value) ? value : fallback;
  }

  private nonNegativeInteger(value: number): number {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Get cards due for review
   */
  static getCardsForReview(cards: FSRSCard[], reviewTime: Date = new Date()): FSRSCard[] {
    return cards.filter(card => card.nextReview <= reviewTime);
  }

  /**
   * Get new cards for learning
   */
  static getNewCards(cards: FSRSCard[], limit: number = 20): FSRSCard[] {
    return cards
      .filter(card => card.state === 'new')
      .slice(0, limit);
  }
}
