import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { LoginInput, ApiResponse, AuthResponse, Deck, StudyStats, StudySession, ReviewInput } from '../types/shared';

import { Platform } from 'react-native';

// Dynamic API URL based on platform
const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      // iOS Simulator - use host machine's IP address
      return 'http://10.0.0.10:3002/api/student';
    } else if (Platform.OS === 'android') {
      // Android Emulator - use Android emulator IP
      return 'http://10.0.2.2:3002/api/student';
    } else {
      // Web development
      return 'http://localhost:3002/api/student';
    }
  }
  // Production - would use your actual API domain
  return 'http://localhost:3002/api/student';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  private token: string | null = null;

  constructor() {
    this.initializeToken();
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
    const response = await axios.post<ApiResponse<AuthResponse>>(
      `${API_BASE_URL}/auth/login`,
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
    this.token = null;
    await SecureStore.deleteItemAsync('authToken');
  }

  async getAvailableDecks(): Promise<Deck[]> {
    const headers = await this.getAuthHeaders();
    const response = await axios.get<ApiResponse<Deck[]>>(
      `${API_BASE_URL}/decks`,
      { headers }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch decks');
  }

  async getDeckForStudy(deckId: string): Promise<{ deckId: string; cards: any[] }> {
    const headers = await this.getAuthHeaders();
    const response = await axios.get<ApiResponse<{ deckId: string; cards: any[] }>>(
      `${API_BASE_URL}/decks/${deckId}`,
      { headers }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch deck');
  }

  async getStudyStats(): Promise<StudyStats> {
    const headers = await this.getAuthHeaders();
    const response = await axios.get<ApiResponse<StudyStats>>(
      `${API_BASE_URL}/progress/stats`,
      { headers }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch study stats');
  }

  async createStudySession(deckId: string): Promise<StudySession> {
    const headers = await this.getAuthHeaders();
    const response = await axios.post<ApiResponse<StudySession>>(
      `${API_BASE_URL}/progress/sessions`,
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
    
    const response = await axios.post<ApiResponse<any>>(
      `${API_BASE_URL}/progress/review`,
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
    const response = await axios.put<ApiResponse<StudySession>>(
      `${API_BASE_URL}/progress/sessions/${sessionId}/end`,
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
    const response = await axios.get<ApiResponse<StudySession[]>>(
      `${API_BASE_URL}/progress/sessions?limit=${limit}`,
      { headers }
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch recent sessions');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const apiService = new ApiService();
export default apiService;