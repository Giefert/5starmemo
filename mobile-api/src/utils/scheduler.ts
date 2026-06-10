import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating,
  State,
  Card,
  Grade,
  S_MIN,
  S_MAX,
} from 'ts-fsrs';
import { FSRSCard } from '../../../shared/types';

// FSRS-6 with library default weights (21 params) and default decay.
// request_retention and maximum_interval carried over from the previous
// hand-rolled engine.
const PARAMS = generatorParameters({
  enable_short_term: true,
  request_retention: 0.9,
  maximum_interval: 36500,
});

// Single seam for a future per-user weight optimizer: grading reads weights
// only through this function. Until an optimizer exists it returns the
// FSRS-6 defaults for every user.
export function getWeightsForUser(_userId: string): readonly number[] {
  return PARAMS.w;
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

const STATE_TO_DB: Record<State, ReviewResult['state']> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

const DB_TO_STATE: Record<ReviewResult['state'], State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

// fsrs_cards doesn't store ts-fsrs's elapsed_days/scheduled_days/learning_steps
// bookkeeping; the scheduler derives elapsed time from last_review, so zeroing
// them only resets the intra-day learning-step position.
function toTsFsrsCard(card: FSRSCard, now: Date): Card {
  if (card.state === 'new' && card.reps === 0) {
    return createEmptyCard(now);
  }
  return {
    due: new Date(card.nextReview),
    // Rows written by the old hand-rolled engine can hold values outside
    // ts-fsrs's valid memory-state domain, which makes it throw. Clamp them
    // in rather than failing the review.
    stability: Math.min(Math.max(card.stability, S_MIN), S_MAX),
    difficulty: Math.min(Math.max(card.difficulty, 1), 10),
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: DB_TO_STATE[card.state],
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

export function gradeCard(
  userId: string,
  card: FSRSCard,
  rating: 1 | 2 | 3 | 4,
  now: Date = new Date(),
): ReviewResult {
  const engine = fsrs({ ...PARAMS, w: [...getWeightsForUser(userId)] });
  const { card: next } = engine.next(toTsFsrsCard(card, now), now, rating as Grade);

  return {
    difficulty: next.difficulty,
    stability: next.stability,
    retrievability: engine.get_retrievability(next, now, false),
    grade: rating,
    lapses: next.lapses,
    reps: next.reps,
    state: STATE_TO_DB[next.state],
    nextReview: next.due,
  };
}

export { Rating };
