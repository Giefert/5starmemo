// Shared types for 5StarMemo BFF Architecture

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'student' | 'management';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  role: 'student' | 'management';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface Deck {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  createdBy: string;
  isPublic: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  cards?: Card[];
  cardCount?: number;
  newCards?: number;
  reviewCards?: number;
}

export interface CreateDeckInput {
  title: string;
  description?: string;
  categoryId?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
}

export interface UpdateDeckInput extends Partial<CreateDeckInput> {}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  imageUrl?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  // Restaurant-specific fields
  restaurantData?: RestaurantCardData;
}

export interface RestaurantCardData {
  itemName: string;
  category: 'food' | 'wine' | 'beer' | 'cocktail' | 'spirit' | 'non-alcoholic';
  description: string;
  ingredients?: string[];
  allergens?: string[];
  region?: string;
  producer?: string;
  vintage?: number;
  abv?: number; // alcohol by volume percentage
  grapeVarieties?: string[]; // cepage for wines
  tastingNotes?: string[];
  servingTemp?: string;
  foodPairings?: string[];
  pricePoint?: 'budget' | 'mid-range' | 'premium' | 'luxury';
  specialNotes?: string;
}

export interface CreateCardInput {
  front: string;
  back: string;
  imageUrl?: string;
  order?: number;
  restaurantData?: RestaurantCardData;
}

export interface UpdateCardInput extends Partial<CreateCardInput> {}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  color?: string;
}

// FSRS (Free Spaced Repetition Scheduler) types
export interface FSRSCard {
  id: string;
  cardId: string;
  userId: string;
  difficulty: number;
  stability: number;
  retrievability: number;
  grade: number;
  lapses: number;
  reps: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
  lastReview?: Date;
  nextReview: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudySession {
  id: string;
  userId: string;
  deckId: string;
  cardsStudied: number;
  correctAnswers: number;
  averageRating: number;
}

export interface ReviewInput {
  cardId: string;
  rating: 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
}

export interface StudyStats {
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  masteredCards: number;
  dailyStats: {
    studied: number;
    correct: number;
    streak: number;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Management-specific types for Web API
export interface DeckWithStats extends Deck {
  totalStudents: number;
  totalSessions: number;
  averageRating: number;
}

export interface UserStats {
  totalDecks: number;
  totalCards: number;
  totalStudents: number;
  averageSessionTime: number;
}

// Student-specific types for Mobile API
export interface StudentDeck {
  id: string;
  title: string;
  description?: string;
  isFeatured: boolean;
  cardCount: number;
  newCards: number;
  reviewCards: number;
  nextReviewAt?: Date;
}

export interface StudyCardData {
  card: Card;
  fsrsData: FSRSCard;
  isNew: boolean;
}