import axios from 'axios';
import { ApiResponse, AuthResponse, LoginInput, CreateUserInput, Deck, CreateDeckInput, UpdateDeckInput } from '../../../shared/types';

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
    if (error.response?.status === 401 || error.response?.status === 403) {
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

export default api;