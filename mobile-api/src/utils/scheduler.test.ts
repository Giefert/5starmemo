import { describe, it, expect } from 'vitest';
import { gradeCard, getWeightsForUser } from './scheduler';
import { FSRSCard } from '../../../shared/types';

const NOW = new Date('2026-06-10T12:00:00Z');
const USER = 'user-1';

// Mirrors the default object ProgressModel.getFSRSCard returns for an
// unreviewed card.
function makeCard(overrides: Partial<FSRSCard> = {}): FSRSCard {
  return {
    id: '',
    cardId: 'card-1',
    userId: USER,
    difficulty: 0,
    stability: 0,
    retrievability: 0,
    grade: 0,
    lapses: 0,
    reps: 0,
    state: 'new',
    lastReview: undefined,
    nextReview: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const RATINGS = [1, 2, 3, 4] as const;

describe('getWeightsForUser', () => {
  it('returns the 21-parameter FSRS-6 default weight set', () => {
    expect(getWeightsForUser(USER)).toHaveLength(21);
  });
});

describe('gradeCard on a new card', () => {
  it.each(RATINGS)('rating %i produces sane, finite FSRS values', (rating) => {
    const result = gradeCard(USER, makeCard(), rating, NOW);

    expect(Number.isFinite(result.difficulty)).toBe(true);
    expect(result.difficulty).toBeGreaterThanOrEqual(1);
    expect(result.difficulty).toBeLessThanOrEqual(10);
    expect(Number.isFinite(result.stability)).toBe(true);
    expect(result.stability).toBeGreaterThan(0);
    // stability column is DECIMAL(13,8); values must stay storable
    expect(result.stability).toBeLessThan(1e5);
    expect(result.retrievability).toBeGreaterThanOrEqual(0);
    expect(result.retrievability).toBeLessThanOrEqual(1);
    expect(result.grade).toBe(rating);
    expect(result.reps).toBe(1);
    expect(result.lapses).toBe(0);
    expect(result.nextReview.getTime()).toBeGreaterThan(NOW.getTime());
    expect(['learning', 'review']).toContain(result.state);
  });

  it('schedules longer intervals for better ratings', () => {
    const due = RATINGS.map(
      (rating) => gradeCard(USER, makeCard(), rating, NOW).nextReview.getTime(),
    );
    expect(due[0]).toBeLessThanOrEqual(due[1]); // Again <= Hard
    expect(due[1]).toBeLessThanOrEqual(due[2]); // Hard <= Good
    expect(due[2]).toBeLessThanOrEqual(due[3]); // Good <= Easy
  });

  it('higher ratings never yield a harder card', () => {
    const difficulty = RATINGS.map(
      (rating) => gradeCard(USER, makeCard(), rating, NOW).difficulty,
    );
    expect(difficulty[3]).toBeLessThanOrEqual(difficulty[2]);
    expect(difficulty[2]).toBeLessThanOrEqual(difficulty[1]);
    expect(difficulty[1]).toBeLessThanOrEqual(difficulty[0]);
  });
});

describe('gradeCard on a review-state card', () => {
  const reviewCard = () =>
    makeCard({
      difficulty: 5.2,
      stability: 12.5,
      retrievability: 0.9,
      grade: 3,
      lapses: 1,
      reps: 6,
      state: 'review',
      lastReview: new Date('2026-05-28T12:00:00Z'),
      nextReview: new Date('2026-06-09T12:00:00Z'),
    });

  it('Again lapses the card into relearning', () => {
    const result = gradeCard(USER, reviewCard(), 1, NOW);
    expect(result.state).toBe('relearning');
    expect(result.lapses).toBe(2);
    expect(result.reps).toBe(7);
    expect(result.stability).toBeGreaterThan(0);
  });

  it('Good grows stability and pushes the due date out at least a day', () => {
    const result = gradeCard(USER, reviewCard(), 3, NOW);
    expect(result.state).toBe('review');
    expect(result.stability).toBeGreaterThan(12.5);
    expect(result.nextReview.getTime() - NOW.getTime()).toBeGreaterThanOrEqual(
      24 * 60 * 60 * 1000,
    );
  });
});

describe('gradeCard same-day re-review', () => {
  it('re-reviewing a learning card minutes later advances the schedule', () => {
    const first = gradeCard(USER, makeCard(), 3, NOW);
    const fiveMinLater = new Date(NOW.getTime() + 5 * 60 * 1000);
    const card = makeCard({
      difficulty: first.difficulty,
      stability: first.stability,
      grade: 3,
      reps: first.reps,
      state: first.state,
      lastReview: NOW,
      nextReview: first.nextReview,
    });
    const second = gradeCard(USER, card, 3, fiveMinLater);

    expect(second.reps).toBe(2);
    expect(Number.isFinite(second.stability)).toBe(true);
    expect(second.nextReview.getTime()).toBeGreaterThan(fiveMinLater.getTime());
  });
});
