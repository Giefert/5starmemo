import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import {
  LoginInput,
  ApiResponse,
  AuthResponse,
  Deck,
  StudyStats,
  StudySession,
  ReviewInput,
  GlossaryCategory,
  GlossaryTermSummary,
  GlossaryTerm
} from '../types/shared';

import { Platform } from 'react-native';

const getApiBaseUrl = () => {
  if (__DEV__) {
    return Platform.OS === 'android'
      ? 'http://10.0.2.2:3002/api/student'
      : 'http://localhost:3002/api/student';
  }
  return Constants.expoConfig?.extra?.apiUrl || 'https://api.tusavor.com/api/student';
};

const API_BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

class ApiService {
  private token: string | null = null;

  constructor() {
    this.initializeToken();
    this.setupInterceptors();
  }

  private setupInterceptors() {
    apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          await this.clearStoredCredentials();
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
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('userData');
  }

  private async initializeToken() {
    try {
      this.token = await SecureStore.getItemAsync('authToken');
    } catch (error) {
      console.warn('Failed to load auth token:', error);
    }
  }

  private async getAuthHeaders() {
    if (!this.token) {
      await this.initializeToken();
    }
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

  async getAvailableDecks(): Promise<Deck[]> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.get<ApiResponse<Deck[]>>(
      `/decks`,
      { headers }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch decks');
  }

  async getDeckForStudy(deckId: string): Promise<{ deckId: string; cards: any[] }> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.get<ApiResponse<{ deckId: string; cards: any[] }>>(
      `/decks/${deckId}`,
      { headers }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch deck');
  }

  async getStudyStats(): Promise<StudyStats> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.get<ApiResponse<StudyStats>>(
      `/progress/stats`,
      { headers }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch study stats');
  }

  async createStudySession(deckId: string): Promise<StudySession> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.post<ApiResponse<StudySession>>(
      `/progress/sessions`,
      { deckId },
      { headers }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to create study session');
  }

  async submitReview(reviewData: ReviewInput, sessionId?: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const payload = sessionId ? { ...reviewData, sessionId } : reviewData;
    
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

  async endStudySession(sessionId: string, stats: {
    cardsStudied: number;
    correctAnswers: number;
    averageRating: number;
  }): Promise<StudySession> {
    const headers = await this.getAuthHeaders();
    const response = await apiClient.put<ApiResponse<StudySession>>(
      `/progress/sessions/${sessionId}/end`,
      stats,
      { headers }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to end study session');
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