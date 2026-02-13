import axios from 'axios';
import {
  ApiResponse,
  AuthResponse,
  LoginInput,
  CreateUserInput,
  Deck,
  CreateDeckInput,
  UpdateDeckInput,
  GlossaryCategory,
  GlossaryTerm,
  GlossaryTermCard,
  CreateGlossaryCategoryInput,
  UpdateGlossaryCategoryInput,
  CreateGlossaryTermInput,
  UpdateGlossaryTermInput,
  TermSuggestionResponse
} from '../../../shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error.response?.status, error.response?.data, error.config?.url);
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('Auth error - logging out user');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authApi = {
  login: async (credentials: LoginInput): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    return response.data.data!;
  },

  register: async (userData: CreateUserInput): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', userData);
    return response.data.data!;
  },
};

// Deck API functions
export const deckApi = {
  getAll: async (): Promise<Deck[]> => {
    const response = await api.get<ApiResponse<Deck[]>>('/decks');
    return response.data.data!;
  },

  getById: async (id: string): Promise<Deck> => {
    const response = await api.get<ApiResponse<Deck>>(`/decks/${id}`);
    return response.data.data!;
  },

  create: async (deckData: CreateDeckInput): Promise<Deck> => {
    const response = await api.post<ApiResponse<Deck>>('/decks', deckData);
    return response.data.data!;
  },

  update: async (id: string, deckData: UpdateDeckInput): Promise<Deck> => {
    const response = await api.put<ApiResponse<Deck>>(`/decks/${id}`, deckData);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/decks/${id}`);
  },

  addCard: async (deckId: string, cardData: any): Promise<any> => {
    const response = await api.post<ApiResponse<any>>(`/decks/${deckId}/cards`, cardData);
    return response.data.data!;
  },

  updateCard: async (cardId: string, cardData: any): Promise<any> => {
    const response = await api.put<ApiResponse<any>>(`/decks/cards/${cardId}`, cardData);
    return response.data.data!;
  },

  deleteCard: async (cardId: string): Promise<void> => {
    await api.delete(`/decks/cards/${cardId}`);
  },
};

// Glossary API functions
export const glossaryApi = {
  // Categories
  getCategories: async (): Promise<GlossaryCategory[]> => {
    const response = await api.get<ApiResponse<GlossaryCategory[]>>('/glossary/categories');
    return response.data.data!;
  },

  createCategory: async (data: CreateGlossaryCategoryInput): Promise<GlossaryCategory> => {
    const response = await api.post<ApiResponse<GlossaryCategory>>('/glossary/categories', data);
    return response.data.data!;
  },

  updateCategory: async (id: string, data: UpdateGlossaryCategoryInput): Promise<GlossaryCategory> => {
    const response = await api.put<ApiResponse<GlossaryCategory>>(`/glossary/categories/${id}`, data);
    return response.data.data!;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/glossary/categories/${id}`);
  },

  // Terms
  getTerms: async (categoryId?: string): Promise<GlossaryTerm[]> => {
    const params = categoryId ? { categoryId } : {};
    const response = await api.get<ApiResponse<GlossaryTerm[]>>('/glossary/terms', { params });
    return response.data.data!;
  },

  getTermById: async (id: string): Promise<GlossaryTerm> => {
    const response = await api.get<ApiResponse<GlossaryTerm>>(`/glossary/terms/${id}`);
    return response.data.data!;
  },

  createTerm: async (data: CreateGlossaryTermInput): Promise<GlossaryTerm> => {
    const response = await api.post<ApiResponse<GlossaryTerm>>('/glossary/terms', data);
    return response.data.data!;
  },

  updateTerm: async (id: string, data: UpdateGlossaryTermInput): Promise<GlossaryTerm> => {
    const response = await api.put<ApiResponse<GlossaryTerm>>(`/glossary/terms/${id}`, data);
    return response.data.data!;
  },

  deleteTerm: async (id: string): Promise<void> => {
    await api.delete(`/glossary/terms/${id}`);
  },

  // Card linking
  getSuggestions: async (termId: string, limit = 20): Promise<TermSuggestionResponse> => {
    const response = await api.get<ApiResponse<TermSuggestionResponse>>(
      `/glossary/terms/${termId}/suggestions`,
      { params: { limit } }
    );
    return response.data.data!;
  },

  searchCards: async (query: string, limit = 20): Promise<TermSuggestionResponse> => {
    const response = await api.get<ApiResponse<TermSuggestionResponse>>(
      '/glossary/cards/search',
      { params: { q: query, limit } }
    );
    return response.data.data!;
  },

  linkCard: async (termId: string, cardId: string, matchField?: string, matchContext?: string): Promise<GlossaryTermCard> => {
    const response = await api.post<ApiResponse<GlossaryTermCard>>(
      `/glossary/terms/${termId}/cards/${cardId}`,
      { matchField, matchContext }
    );
    return response.data.data!;
  },

  unlinkCard: async (termId: string, cardId: string): Promise<void> => {
    await api.delete(`/glossary/terms/${termId}/cards/${cardId}`);
  },
};

export default api;