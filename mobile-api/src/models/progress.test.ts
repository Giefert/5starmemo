import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const db = vi.hoisted(() => {
  const clientQuery = vi.fn();
  const release = vi.fn();
  const client = { query: clientQuery, release };
  return {
    client,
    clientQuery,
    connect: vi.fn(),
    poolQuery: vi.fn(),
    release,
  };
});

vi.mock('../config/database', () => ({
  default: {
    connect: db.connect,
    query: db.poolQuery,
  },
}));

vi.mock('../utils/scheduler', () => ({
  gradeCard: vi.fn(() => ({
    difficulty: 5,
    stability: 2,
    retrievability: 0.9,
    grade: 3,
    lapses: 0,
    reps: 1,
    state: 'learning',
    nextReview: new Date('2026-07-24T12:00:00Z'),
  })),
}));

import { ProgressModel } from './progress';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CARD_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SESSION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const FSRS_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const fsrsRow = {
  id: FSRS_ID,
  card_id: CARD_ID,
  user_id: USER_ID,
  difficulty: 5,
  stability: 2,
  retrievability: 0.9,
  grade: 3,
  lapses: 0,
  reps: 1,
  state: 'learning',
  last_review: new Date('2026-07-23T12:00:00Z'),
  next_review: new Date('2026-07-24T12:00:00Z'),
  created_at: new Date('2026-07-23T12:00:00Z'),
  updated_at: new Date('2026-07-23T12:00:00Z'),
};

const sessionRow = {
  id: SESSION_ID,
  user_id: USER_ID,
  deck_id: null,
  curation_kind: 'featured',
  cards_studied: 1,
  correct_answers: 1,
  average_rating: 4,
};

function normalizedQueries(): string[] {
  return db.clientQuery.mock.calls.map(([query]) =>
    String(query).replace(/\s+/g, ' ').trim(),
  );
}

describe('ProgressModel.submitReview final-session transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.connect.mockResolvedValue(db.client);
  });

  it('commits the review and final session update in one transaction', async () => {
    db.clientQuery.mockImplementation(async (query: string) => {
      const sql = query.replace(/\s+/g, ' ').trim();
      if (sql.startsWith('SELECT * FROM fsrs_cards')) return { rows: [] };
      if (sql.startsWith('INSERT INTO fsrs_cards')) return { rows: [fsrsRow] };
      if (sql.startsWith('INSERT INTO card_reviews')) return { rows: [{ id: 'review-id' }] };
      if (sql.startsWith('UPDATE study_sessions')) return { rows: [sessionRow] };
      return { rows: [] };
    });

    const result = await ProgressModel.submitReview(
      USER_ID,
      { cardId: CARD_ID, rating: 3 },
      SESSION_ID,
      { cardsStudied: 1, correctAnswers: 1, averageRating: 4 },
    );

    const queries = normalizedQueries();
    expect(queries[0]).toBe('BEGIN');
    expect(queries.findIndex(sql => sql.startsWith('INSERT INTO fsrs_cards')))
      .toBeLessThan(queries.findIndex(sql => sql.startsWith('INSERT INTO card_reviews')));
    expect(queries.findIndex(sql => sql.startsWith('INSERT INTO card_reviews')))
      .toBeLessThan(queries.findIndex(sql => sql.startsWith('UPDATE study_sessions')));
    expect(queries.at(-1)).toBe('COMMIT');
    expect(queries).not.toContain('ROLLBACK');
    expect(result.session).toMatchObject({
      id: SESSION_ID,
      userId: USER_ID,
      cardsStudied: 1,
      correctAnswers: 1,
      averageRating: 4,
    });
    expect(db.release).toHaveBeenCalledOnce();
  });

  it('rolls back the review when the final session does not belong to the user', async () => {
    db.clientQuery.mockImplementation(async (query: string) => {
      const sql = query.replace(/\s+/g, ' ').trim();
      if (sql.startsWith('SELECT * FROM fsrs_cards')) return { rows: [] };
      if (sql.startsWith('INSERT INTO fsrs_cards')) return { rows: [fsrsRow] };
      if (sql.startsWith('INSERT INTO card_reviews')) return { rows: [{ id: 'review-id' }] };
      if (sql.startsWith('UPDATE study_sessions')) return { rows: [] };
      return { rows: [] };
    });

    await expect(ProgressModel.submitReview(
      USER_ID,
      { cardId: CARD_ID, rating: 3 },
      SESSION_ID,
      { cardsStudied: 1, correctAnswers: 1, averageRating: 4 },
    )).rejects.toMatchObject({
      name: 'StudySessionNotFoundError',
    });

    const queries = normalizedQueries();
    expect(queries).toContain('ROLLBACK');
    expect(queries).not.toContain('COMMIT');
    expect(db.release).toHaveBeenCalledOnce();
  });

  it('rolls back a non-final review when the session does not belong to the user', async () => {
    db.clientQuery.mockImplementation(async (query: string) => {
      const sql = query.replace(/\s+/g, ' ').trim();
      if (sql.startsWith('SELECT * FROM fsrs_cards')) return { rows: [] };
      if (sql.startsWith('INSERT INTO fsrs_cards')) return { rows: [fsrsRow] };
      if (sql.startsWith('INSERT INTO card_reviews')) return { rows: [] };
      return { rows: [] };
    });

    await expect(ProgressModel.submitReview(
      USER_ID,
      { cardId: CARD_ID, rating: 3 },
      SESSION_ID,
    )).rejects.toMatchObject({
      name: 'StudySessionNotFoundError',
    });

    const queries = normalizedQueries();
    expect(queries).toContain('ROLLBACK');
    expect(queries).not.toContain('COMMIT');
    expect(queries.some(sql => sql.startsWith('UPDATE study_sessions'))).toBe(false);
    expect(db.release).toHaveBeenCalledOnce();
  });
});

describe('ProgressModel.endStudySession ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scopes the legacy session update to the authenticated user', async () => {
    db.poolQuery.mockResolvedValue({ rows: [sessionRow] });
    const stats = {
      cardsStudied: 1,
      correctAnswers: 1,
      averageRating: 4,
    };

    await ProgressModel.endStudySession(SESSION_ID, USER_ID, stats);

    const [query, values] = db.poolQuery.mock.calls[0];
    expect(String(query).replace(/\s+/g, ' ')).toContain(
      'WHERE id = $1 AND user_id = $2',
    );
    expect(values).toEqual([
      SESSION_ID,
      USER_ID,
      stats.cardsStudied,
      stats.correctAnswers,
      stats.averageRating,
    ]);
  });
});
