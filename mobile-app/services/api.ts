import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {
  LoginInput,
  ApiResponse,
  AuthResponse,
  StudentDeck,
  StudyCardData,
  StudyCardSearchResult,
  StudyDeckSearchResult,
  StudySession,
  ReviewInput,
  GlossaryCategory,
  GlossaryTermSummary,
  GlossaryTerm,
  BulletinPayload,
  CurationKind,
  CurationStudyUnit,
} from '../types/shared';

const getApiBaseUrl = () => {
  return Constants.expoConfig?.extra?.apiUrl || 'https://api.tusavor.com/api/student';
};

const API_BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

class ApiService {
  private token: string | null = null;
  private authExpiredHandler: (() => void) | null = null;

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          try {
            await this.clearStoredCredentials();
          } catch (storageError) {
            console.warn('Failed to clear expired credentials:', storageError);
          }
          this.authExpiredHandler?.();
          const authError = new Error('Authentication expired. Please log in again.');
          authError.name = 'AuthenticationError';
          throw authError;
        }
        throw error;
      }
    );
  }

  private async clearStoredCredentials() {
    this.token = null;
    await Promise.all([
      SecureStore.deleteItemAsync('authToken'),
      SecureStore.deleteItemAsync('userData'),
      SecureStore.deleteItemAsync('restaurantData'),
    ]);
  }

  hydrateToken(token: string | null) {
    this.token = token;
  }

  setAuthExpiredHandler(handler: () => void): () => void {
    this.authExpiredHandler = handler;
    return () => {
      if (this.authExpiredHandler === handler) {
        this.authExpiredHandler = null;
      }
    };
  }

  private getAuthHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  async login(credentials: LoginInput): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      `/auth/login`,
      credentials
    );
    
    if (response.data.success && response.data.data) {
      this.token = response.data.data.token;
      await SecureStore.setItemAsync('authToken', this.token);
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Login failed');
  }

  async logout() {
    await this.clearStoredCredentials();
  }

  async deleteAccount(): Promise<void> {
    const headers = await this.getAuthHeaders();
    await apiClient.delete('/auth/account', { headers });
    await this.clearStoredCredentials();
  }

  async exportData(): Promise<string> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.get('/auth/export', { headers });
    return JSON.stringify(response.data.data, null, 2);
  }

  async getBulletin(): Promise<BulletinPayload> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.get<ApiResponse<BulletinPayload>>(
      `/bulletin`,
      { headers }
    );

    if (response.data.success && response.data.data) return response.data.data;

    throw new Error(response.data.error || 'Failed to fetch bulletin');
  }

  async getAvailableDecks(): Promise<StudentDeck[]> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.get<ApiResponse<StudentDeck[]>>(
      `/decks`,
      { headers }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch decks');
  }

  async searchStudyDecks(query: string): Promise<StudyDeckSearchResult> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.get<ApiResponse<StudyDeckSearchResult>>(
      `/decks/search`,
      { headers, params: { q: query } }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to search decks');
  }

  async searchStudyCards(query: string, limit: number = 30): Promise<StudyCardSearchResult[]> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.get<ApiResponse<{ cards: StudyCardSearchResult[] }>>(
      `/decks/cards/search`,
      { headers, params: { q: query, limit } }
    );

    if (response.data.success && response.data.data) {
      return response.data.data.cards;
    }

    throw new Error(response.data.error || 'Failed to search cards');
  }

  async getStudyCardsByIds(cardIds: string[]): Promise<StudyCardData[]> {
    if (cardIds.length === 0) return [];

    const headers = await this.getAuthHeaders();
    const response = await apiClient.post<ApiResponse<{ cards: StudyCardData[] }>>(
      `/decks/cards/batch`,
      { cardIds },
      { headers }
    );

    if (response.data.success && response.data.data) {
      return response.data.data.cards;
    }

    throw new Error(response.data.error || 'Failed to fetch cards');
  }

  async getDeckForStudy(
    deckId: string,
    mode: 'recommended' | 'full' = 'recommended'
  ): Promise<{ deckId: string; cards: StudyCardData[] }> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.get<ApiResponse<{ deckId: string; cards: StudyCardData[] }>>(
      `/decks/${deckId}`,
      { headers, params: { mode } }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch deck');
  }

  async startGradedStudySession(
    target: { deckId: string } | { curationKind: CurationKind }
  ): Promise<
    | {
        session: StudySession;
        study: { kind: 'deck'; deckId: string; cards: StudyCardData[] };
      }
    | {
        session: StudySession;
        study: {
          kind: 'curation';
          curationKind: CurationKind;
          units: CurationStudyUnit[];
        };
      }
  > {
    const headers = this.getAuthHeaders();
    const response = await apiClient.post<ApiResponse<
      | {
          session: StudySession;
          study: { kind: 'deck'; deckId: string; cards: StudyCardData[] };
        }
      | {
          session: StudySession;
          study: {
            kind: 'curation';
            curationKind: CurationKind;
            units: CurationStudyUnit[];
          };
        }
    >>(
      `/progress/sessions/start`,
      target,
      { headers }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to start study session');
  }

  async submitReview(
    reviewData: ReviewInput,
    sessionId?: string,
    finalStats?: {
      cardsStudied: number;
      correctAnswers: number;
      averageRating: number;
    },
  ): Promise<any> {
    const headers = await this.getAuthHeaders();
    const payload = sessionId
      ? { ...reviewData, sessionId, ...(finalStats ? { finalStats } : {}) }
      : reviewData;
    
    const response = await apiClient.post<ApiResponse<any>>(
      `/progress/review`,
      payload,
      { headers }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to submit review');
  }

  async resetFsrs(deckIds?: string[]): Promise<number> {
    const headers = await this.getAuthHeaders();
    const body = deckIds && deckIds.length > 0 ? { deckIds } : {};
    const response = await apiClient.delete<ApiResponse<{ resetCount: number }>>(
      `/progress/fsrs`,
      { headers, data: body }
    );

    if (response.data.success && response.data.data) {
      return response.data.data.resetCount;
    }

    throw new Error(response.data.error || 'Failed to reset progress');
  }

  async getRecentSessions(limit: number = 10): Promise<StudySession[]> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.get<ApiResponse<StudySession[]>>(
      `/progress/sessions?limit=${limit}`,
      { headers }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch recent sessions');
  }

  // Glossary methods
  async getGlossaryCategories(section?: string): Promise<GlossaryCategory[]> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams();
    if (section) params.append('section', section);
    const url = params.toString()
      ? `/glossary/categories?${params.toString()}`
      : `/glossary/categories`;
    const response = await apiClient.get<ApiResponse<GlossaryCategory[]>>(
      url,
      { headers }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to fetch glossary categories');
  }

  async getGlossaryTerms(options?: {
    categoryId?: string;
    section?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ terms: GlossaryTermSummary[]; total: number }> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams();
    if (options?.categoryId) params.append('categoryId', options.categoryId);
    if (options?.section) params.append('section', options.section);
    if (options?.search) params.append('search', options.search);
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await apiClient.get<any>(
      `/glossary/terms?${params.toString()}`,
      { headers }
    );

    if (response.data.success && response.data.data) {
      return {
        terms: response.data.data,
        total: response.data.pagination?.total || response.data.data.length
      };
    }

    throw new Error(response.data.error || 'Failed to fetch glossary terms');
  }

  async getGlossaryTerm(id: string): Promise<GlossaryTerm> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.get<ApiResponse<GlossaryTerm>>(
      `/glossary/terms/${id}`,
      { headers }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to fetch glossary term');
  }

  async getTermsForCard(cardId: string): Promise<{ id: string; term: string; definition: string; matchField: string | null; matchContext: string | null }[]> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.get<ApiResponse<any>>(
      `/glossary/cards/${cardId}/terms`,
      { headers }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.error || 'Failed to fetch terms for card');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const apiService = new ApiService();
export default apiService;
