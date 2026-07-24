import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const STUDENT = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'student@example.com',
  role: 'student' as const,
  restaurantId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};

vi.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: () => void) => {
    req.user = STUDENT;
    next();
  },
  requireStudent: (_req: any, _res: any, next: () => void) => next(),
}));

vi.mock('../models/progress', () => ({
  ProgressModel: {
    cardInRestaurant: vi.fn(),
    createStudySession: vi.fn(),
    discardEmptyStudySession: vi.fn(),
    endStudySession: vi.fn(),
    submitReview: vi.fn(),
  },
}));

vi.mock('../models/deck', () => ({
  DeckModel: {
    isDeckAvailable: vi.fn(),
    getDeckForStudy: vi.fn(),
  },
}));

vi.mock('../models/bulletin', () => ({
  BulletinModel: {
    getStudyUnits: vi.fn(),
  },
}));

import progressRouter from './progress';
import { BulletinModel } from '../models/bulletin';
import { DeckModel } from '../models/deck';
import { ProgressModel } from '../models/progress';

const DECK_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SESSION_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CARD_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const session = {
  id: SESSION_ID,
  userId: STUDENT.id,
  deckId: DECK_ID,
  curationKind: null,
  cardsStudied: 0,
  correctAnswers: 0,
  averageRating: 0,
};

const cards = [{
  card: {
    id: CARD_ID,
    deckId: DECK_ID,
    createdAt: new Date('2026-07-23T12:00:00Z'),
    updatedAt: new Date('2026-07-23T12:00:00Z'),
  },
  fsrsData: {
    id: '',
    cardId: CARD_ID,
    userId: STUDENT.id,
    difficulty: 0,
    stability: 0,
    retrievability: 0,
    grade: 0,
    lapses: 0,
    reps: 0,
    state: 'new' as const,
    nextReview: new Date('2026-07-23T12:00:00Z'),
    createdAt: new Date('2026-07-23T12:00:00Z'),
    updatedAt: new Date('2026-07-23T12:00:00Z'),
  },
  isNew: true,
}];

async function callRoute(
  method: 'post' | 'put',
  path: string,
  body: Record<string, unknown>,
  params: Record<string, string> = {},
) {
  const route = (progressRouter as any).stack
    .find((layer: any) => (
      layer.route?.path === path
      && layer.route?.methods?.[method]
    ))
    ?.route;
  if (!route) throw new Error(`${method.toUpperCase()} ${path} route not found`);

  const req = {
    body,
    params,
    query: {},
    user: STUDENT,
  };
  let status = 200;
  let responseBody: any;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(payload: any) {
      responseBody = payload;
      return this;
    },
  };

  for (const layer of route.stack) {
    if (responseBody !== undefined) break;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        error ? reject(error) : resolve();
      };

      try {
        const result = layer.handle(req, res, finish);
        if (result && typeof result.then === 'function') {
          result.then(() => finish(), finish);
        } else if (!settled) {
          finish();
        }
      } catch (error) {
        finish(error);
      }
    });
  }

  return { status, body: responseBody };
}

function callPostRoute(path: string, body: Record<string, unknown>) {
  return callRoute('post', path, body);
}

function callPutRoute(
  path: string,
  params: Record<string, string>,
  body: Record<string, unknown>,
) {
  return callRoute('put', path, body, params);
}

describe('POST /sessions/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DeckModel.isDeckAvailable).mockResolvedValue(true);
    vi.mocked(DeckModel.getDeckForStudy).mockResolvedValue(cards);
    vi.mocked(ProgressModel.createStudySession).mockResolvedValue(session);
    vi.mocked(BulletinModel.getStudyUnits).mockResolvedValue([]);
  });

  it('creates a recommended deck session and returns its cards', async () => {
    const response = await callPostRoute('/sessions/start', { deckId: DECK_ID });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      session: {
        ...session,
        deckId: DECK_ID,
      },
      study: {
        kind: 'deck',
        deckId: DECK_ID,
        cards,
      },
    });
    expect(DeckModel.isDeckAvailable).toHaveBeenCalledOnce();
    expect(DeckModel.getDeckForStudy).toHaveBeenCalledWith(
      DECK_ID,
      STUDENT.id,
      STUDENT.restaurantId,
      'recommended',
    );
    expect(ProgressModel.createStudySession).toHaveBeenCalledWith(
      STUDENT.id,
      { deckId: DECK_ID },
    );
  });

  it('does not create a session for an unavailable deck', async () => {
    vi.mocked(DeckModel.isDeckAvailable).mockResolvedValue(false);

    const response = await callPostRoute('/sessions/start', { deckId: DECK_ID });

    expect(response.status).toBe(404);
    expect(ProgressModel.createStudySession).not.toHaveBeenCalled();
    expect(DeckModel.getDeckForStudy).not.toHaveBeenCalled();
  });

  it('discards a created session if its study queue fails to load', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(DeckModel.getDeckForStudy).mockRejectedValue(new Error('query failed'));

    const response = await callPostRoute('/sessions/start', { deckId: DECK_ID });

    expect(response.status).toBe(500);
    expect(ProgressModel.discardEmptyStudySession).toHaveBeenCalledWith(
      SESSION_ID,
      STUDENT.id,
    );
    consoleError.mockRestore();
  });

  it('creates a curation session and returns its study units', async () => {
    const curationSession = {
      ...session,
      deckId: null,
      curationKind: 'featured' as const,
    };
    const units = [{
      type: 'card' as const,
      targetId: CARD_ID,
      title: 'Featured card',
      cards,
    }];
    vi.mocked(ProgressModel.createStudySession).mockResolvedValue(curationSession);
    vi.mocked(BulletinModel.getStudyUnits).mockResolvedValue(units);

    const response = await callPostRoute('/sessions/start', { curationKind: 'featured' });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      session: curationSession,
      study: {
        kind: 'curation',
        curationKind: 'featured',
        units,
      },
    });
    expect(DeckModel.isDeckAvailable).not.toHaveBeenCalled();
    expect(BulletinModel.getStudyUnits).toHaveBeenCalledWith(
      STUDENT.restaurantId,
      STUDENT.id,
      'featured',
    );
    expect(ProgressModel.createStudySession).toHaveBeenCalledWith(
      STUDENT.id,
      { curationKind: 'featured' },
    );
  });

  it('requires exactly one supported target', async () => {
    const responses = await Promise.all([
      callPostRoute('/sessions/start', {}),
      callPostRoute('/sessions/start', { deckId: DECK_ID, curationKind: 'featured' }),
      callPostRoute('/sessions/start', { curationKind: 'not-a-kind' }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([400, 400, 400]);
    expect(ProgressModel.createStudySession).not.toHaveBeenCalled();
  });
});

describe('PUT /sessions/:id/end', () => {
  const stats = {
    cardsStudied: 3,
    correctAnswers: 2,
    averageRating: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ProgressModel.endStudySession).mockResolvedValue({
      ...session,
      ...stats,
    });
  });

  it('scopes the legacy completion request to the authenticated user', async () => {
    const response = await callPutRoute(
      '/sessions/:id/end',
      { id: SESSION_ID },
      stats,
    );

    expect(response.status).toBe(200);
    expect(ProgressModel.endStudySession).toHaveBeenCalledWith(
      SESSION_ID,
      STUDENT.id,
      stats,
    );
  });
});

describe('POST /review', () => {
  const finalStats = {
    cardsStudied: 3,
    correctAnswers: 2,
    averageRating: 3,
  };
  const completedSession = {
    ...session,
    cardsStudied: finalStats.cardsStudied,
    correctAnswers: finalStats.correctAnswers,
    averageRating: finalStats.averageRating,
  };
  const fsrsCard = {
    ...cards[0].fsrsData,
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    grade: 3,
    reps: 1,
    state: 'learning' as const,
    nextReview: new Date('2026-07-24T12:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ProgressModel.cardInRestaurant).mockResolvedValue(true);
    vi.mocked(ProgressModel.submitReview).mockResolvedValue({
      fsrsCard,
      session: completedSession,
    });
  });

  it('forwards final session stats with the last review', async () => {
    const response = await callPostRoute('/review', {
      cardId: CARD_ID,
      rating: 3,
      sessionId: SESSION_ID,
      finalStats,
    });

    expect(response.status).toBe(200);
    expect(ProgressModel.submitReview).toHaveBeenCalledWith(
      STUDENT.id,
      { cardId: CARD_ID, rating: 3 },
      SESSION_ID,
      finalStats,
    );
    expect(response.body.data).toEqual({
      fsrsCard,
      nextReview: fsrsCard.nextReview,
      session: completedSession,
    });
  });

  it('rejects final stats without a session or with missing fields', async () => {
    const responses = await Promise.all([
      callPostRoute('/review', {
        cardId: CARD_ID,
        rating: 3,
        finalStats,
      }),
      callPostRoute('/review', {
        cardId: CARD_ID,
        rating: 3,
        sessionId: SESSION_ID,
        finalStats: {
          cardsStudied: finalStats.cardsStudied,
          correctAnswers: finalStats.correctAnswers,
        },
      }),
      callPostRoute('/review', {
        cardId: CARD_ID,
        rating: 3,
        sessionId: SESSION_ID,
        finalStats: {
          cardsStudied: 2,
          correctAnswers: 3,
          averageRating: 3,
        },
      }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([400, 400, 400]);
    expect(ProgressModel.cardInRestaurant).not.toHaveBeenCalled();
    expect(ProgressModel.submitReview).not.toHaveBeenCalled();
  });

  it('returns not found when the session cannot be completed', async () => {
    const error = new Error('Study session not found');
    error.name = 'StudySessionNotFoundError';
    vi.mocked(ProgressModel.submitReview).mockRejectedValue(error);

    const response = await callPostRoute('/review', {
      cardId: CARD_ID,
      rating: 3,
      sessionId: SESSION_ID,
      finalStats,
    });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Study session not found');
  });
});
