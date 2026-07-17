import axios from 'axios';
import {
  ApiResponse,
  AuthResponse,
  LoginInput,
  CreateUserInput,
  User,
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
  TermSuggestionResponse,
  GlossarySection,
  Restaurant,
  CurationKind,
  CurationTargetType,
  RestaurantCurationItem,
  UserListItem,
  UserDetail,
  StudentRoleSummary,
  StudentRoleDetail,
  CreateStudentRoleInput,
  UpdateStudentRoleInput,
  DeckAccess,
  Card,
  CreateCardInput,
  UpdateCardInput,
  RestaurantCategory,
} from '../../../shared/types';

export interface CardSearchResult {
  id: string;
  deckId?: string;
  deckTitle: string;
  name: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_WEB_API_URL || 'http://localhost:3001';

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

  // Admin-only: create a new user (student or admin) inside the caller's
  // restaurant. The first admin of a restaurant is bootstrapped via the
  // create-restaurant CLI script on the server, not through this API.
  createUser: async (userData: CreateUserInput): Promise<User> => {
    const response = await api.post<ApiResponse<User>>('/auth/users', userData);
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

  addExistingCard: async (deckId: string, cardId: string): Promise<Card> => {
    const response = await api.post<ApiResponse<Card>>(`/decks/${deckId}/cards/${cardId}`);
    return response.data.data!;
  },

  removeCard: async (deckId: string, cardId: string): Promise<void> => {
    await api.delete(`/decks/${deckId}/cards/${cardId}`);
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
  getTerms: async (categoryId?: string, section?: string): Promise<GlossaryTerm[]> => {
    const params: Record<string, string> = {};
    if (categoryId) params.categoryId = categoryId;
    if (section) params.section = section;
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

// Restaurant (current-tenant metadata + announcements)
export const restaurantApi = {
  me: async (): Promise<Restaurant> => {
    const response = await api.get<ApiResponse<Restaurant>>('/restaurant/me');
    return response.data.data!;
  },

  updateAnnouncements: async (announcements: string[]): Promise<string[]> => {
    const response = await api.put<ApiResponse<{ announcements: string[] }>>(
      '/restaurant/me/announcements',
      { announcements }
    );
    return response.data.data!.announcements;
  },
};

// Bulletin curation lists
export const curationApi = {
  list: async (kind: CurationKind): Promise<RestaurantCurationItem[]> => {
    const response = await api.get<ApiResponse<RestaurantCurationItem[]>>(`/curations/${kind}`);
    return response.data.data!;
  },

  listHiddenInSeason: async (): Promise<RestaurantCurationItem[]> => {
    const response = await api.get<ApiResponse<RestaurantCurationItem[]>>(
      '/curations/in_season/hidden'
    );
    return response.data.data!;
  },

  add: async (
    kind: CurationKind,
    targetType: CurationTargetType,
    targetId: string
  ): Promise<RestaurantCurationItem[]> => {
    const response = await api.post<ApiResponse<RestaurantCurationItem[]>>(
      `/curations/${kind}`,
      { targetType, targetId }
    );
    return response.data.data!;
  },

  remove: async (
    kind: CurationKind,
    targetType: CurationTargetType,
    targetId: string
  ): Promise<void> => {
    await api.delete(`/curations/${kind}/${targetType}/${targetId}`);
  },

  restoreInSeason: async (targetId: string): Promise<void> => {
    await api.delete(`/curations/in_season/hidden/card/${targetId}`);
  },

  reorder: async (
    kind: CurationKind,
    items: { targetType: CurationTargetType; targetId: string }[]
  ): Promise<RestaurantCurationItem[]> => {
    const response = await api.put<ApiResponse<RestaurantCurationItem[]>>(
      `/curations/${kind}/order`,
      { items }
    );
    return response.data.data!;
  },
};

// Card search (lightweight, dashboard-curation-only)
export const cardApi = {
  getAll: async (params?: { q?: string; category?: RestaurantCategory }): Promise<Card[]> => {
    const response = await api.get<ApiResponse<Card[]>>('/cards', { params });
    return response.data.data!;
  },

  getById: async (id: string): Promise<Card> => {
    const response = await api.get<ApiResponse<Card>>(`/cards/${id}`);
    return response.data.data!;
  },

  create: async (data: CreateCardInput): Promise<Card> => {
    const response = await api.post<ApiResponse<Card>>('/cards', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdateCardInput): Promise<Card> => {
    const response = await api.put<ApiResponse<Card>>(`/cards/${id}`, data);
    return response.data.data!;
  },

  merge: async (survivorId: string, duplicateIds: string[]): Promise<Card> => {
    const response = await api.post<ApiResponse<Card>>(`/cards/${survivorId}/merge`, { duplicateIds });
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/cards/${id}`);
  },

  search: async (q: string, limit = 20): Promise<CardSearchResult[]> => {
    const response = await api.get<ApiResponse<CardSearchResult[]>>('/cards/search', {
      params: { q, limit }
    });
    return response.data.data!;
  },
};

// Students and their role / direct-deck access.
export const userApi = {
  getAll: async (): Promise<UserListItem[]> => {
    const response = await api.get<ApiResponse<UserListItem[]>>('/users');
    return response.data.data!;
  },

  getById: async (id: string): Promise<UserDetail> => {
    const response = await api.get<ApiResponse<UserDetail>>(`/users/${id}`);
    return response.data.data!;
  },

  update: async (id: string, data: { email?: string; username?: string }): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data.data!;
  },

  resetPassword: async (id: string, password: string): Promise<void> => {
    await api.put(`/users/${id}/password`, { password });
  },

  setRoles: async (id: string, roleIds: string[]): Promise<{ roles: Array<{ id: string; name: string }> }> => {
    const response = await api.put<ApiResponse<{ roles: Array<{ id: string; name: string }> }>>(
      `/users/${id}/roles`,
      { roleIds }
    );
    return response.data.data!;
  },

  setDecks: async (id: string, deckIds: string[]): Promise<{ directDecks: Array<{ id: string; title: string }> }> => {
    const response = await api.put<ApiResponse<{ directDecks: Array<{ id: string; title: string }> }>>(
      `/users/${id}/decks`,
      { deckIds }
    );
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

// Custom student roles per restaurant.
export const roleApi = {
  getAll: async (): Promise<StudentRoleSummary[]> => {
    const response = await api.get<ApiResponse<StudentRoleSummary[]>>('/roles');
    return response.data.data!;
  },

  getById: async (id: string): Promise<StudentRoleDetail> => {
    const response = await api.get<ApiResponse<StudentRoleDetail>>(`/roles/${id}`);
    return response.data.data!;
  },

  create: async (data: CreateStudentRoleInput): Promise<StudentRoleSummary> => {
    const response = await api.post<ApiResponse<StudentRoleSummary>>('/roles', data);
    return response.data.data!;
  },

  update: async (id: string, data: UpdateStudentRoleInput): Promise<StudentRoleSummary> => {
    const response = await api.put<ApiResponse<StudentRoleSummary>>(`/roles/${id}`, data);
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/roles/${id}`);
  },

  setDecks: async (id: string, deckIds: string[]): Promise<{ decks: Array<{ id: string; title: string }> }> => {
    const response = await api.put<ApiResponse<{ decks: Array<{ id: string; title: string }> }>>(
      `/roles/${id}/decks`,
      { deckIds }
    );
    return response.data.data!;
  },
};

// Deck-centric access editor (read + replace-all).
export const deckAccessApi = {
  get: async (deckId: string): Promise<DeckAccess> => {
    const response = await api.get<ApiResponse<DeckAccess>>(`/decks/${deckId}/access`);
    return response.data.data!;
  },

  set: async (deckId: string, payload: { roleIds: string[]; userIds: string[] }): Promise<DeckAccess> => {
    const response = await api.put<ApiResponse<DeckAccess>>(`/decks/${deckId}/access`, payload);
    return response.data.data!;
  },
};

export default api;
