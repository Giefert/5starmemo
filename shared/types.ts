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
  imageUrl?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  // Restaurant-specific fields
  restaurantData?: RestaurantCardDataV2;
}

// Helper types for discriminated union
export type RestaurantCategory = 'food' | 'wine' | 'beer' | 'cocktail' | 'spirit' | 'non-alcoholic' | 'maki';
export type PricePoint = 'budget' | 'mid-range' | 'premium' | 'luxury';

// V2: Discriminated Union Architecture
// Base fields that apply to ALL categories
interface BaseRestaurantCardData {
  itemName: string;
  category: RestaurantCategory;
  description?: string;
  pricePoint?: PricePoint;
  specialNotes?: string;
}

// Category-specific data layers
type FoodBeverageSharedFields = {
  ingredients?: string[];
  allergens?: string[];
  region?: string;
  producer?: string;
  tastingNotes?: string[];
  servingTemp?: string;
  foodPairings?: string[];
};

type AlcoholicFields = {
  abv?: number;
};

// Discriminated union cases
export type FoodCardData = BaseRestaurantCardData &
  FoodBeverageSharedFields & {
    category: 'food';
  };

export type WineCardData = BaseRestaurantCardData &
  FoodBeverageSharedFields &
  AlcoholicFields & {
    category: 'wine';
    vintage?: number;
    grapeVarieties?: string[];
  };

export type BeerCardData = BaseRestaurantCardData &
  FoodBeverageSharedFields &
  AlcoholicFields & {
    category: 'beer';
  };

export type CocktailCardData = BaseRestaurantCardData &
  FoodBeverageSharedFields &
  AlcoholicFields & {
    category: 'cocktail';
  };

export type SpiritCardData = BaseRestaurantCardData &
  FoodBeverageSharedFields &
  AlcoholicFields & {
    category: 'spirit';
  };

export type NonAlcoholicCardData = BaseRestaurantCardData &
  FoodBeverageSharedFields & {
    category: 'non-alcoholic';
  };

export type MakiCardData = BaseRestaurantCardData & {
  category: 'maki';
  topping?: string;
  base?: string;
  sauce?: string;
  paper?: string;
  gluten?: 'yes' | 'no' | 'optional';
};

/**
 * Restaurant card data using discriminated union pattern based on category.
 *
 * This ensures type safety: TypeScript prevents accessing wine-specific fields
 * (like `vintage`) on maki cards, and vice versa.
 *
 * @example
 * ```typescript
 * if (isMakiCard(card.restaurantData)) {
 *   // TypeScript knows `topping` exists
 *   console.log(card.restaurantData.topping);
 * }
 * ```
 */
export type RestaurantCardDataV2 =
  | FoodCardData
  | WineCardData
  | BeerCardData
  | CocktailCardData
  | SpiritCardData
  | NonAlcoholicCardData
  | MakiCardData;

// V1: Monolithic interface (DEPRECATED - kept for backward compatibility during migration)
export interface RestaurantCardData {
  itemName: string;
  category: 'food' | 'wine' | 'beer' | 'cocktail' | 'spirit' | 'non-alcoholic' | 'maki';
  description?: string;
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
  // Maki-specific fields
  topping?: string;
  base?: string;
  sauce?: string;
  paper?: string;
  gluten?: 'yes' | 'no' | 'optional';
}

export interface CreateCardInput {
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

// Type guards for RestaurantCardDataV2 discriminated union
export function isMakiCard(data: RestaurantCardDataV2): data is MakiCardData {
  return data.category === 'maki';
}

export function isWineCard(data: RestaurantCardDataV2): data is WineCardData {
  return data.category === 'wine';
}

export function isFoodCard(data: RestaurantCardDataV2): data is FoodCardData {
  return data.category === 'food';
}

export function isBeerCard(data: RestaurantCardDataV2): data is BeerCardData {
  return data.category === 'beer';
}

export function isCocktailCard(data: RestaurantCardDataV2): data is CocktailCardData {
  return data.category === 'cocktail';
}

export function isSpiritCard(data: RestaurantCardDataV2): data is SpiritCardData {
  return data.category === 'spirit';
}

export function isNonAlcoholicCard(data: RestaurantCardDataV2): data is NonAlcoholicCardData {
  return data.category === 'non-alcoholic';
}

export function isAlcoholicCard(
  data: RestaurantCardDataV2
): data is WineCardData | BeerCardData | CocktailCardData | SpiritCardData {
  return ['wine', 'beer', 'cocktail', 'spirit'].includes(data.category);
}

// Migration helper: convert V1 to V2 (strips invalid category-specific fields)
export function migrateToV2(v1: RestaurantCardData): RestaurantCardDataV2 {
  const base = {
    itemName: v1.itemName,
    category: v1.category,
    description: v1.description,
    pricePoint: v1.pricePoint,
    specialNotes: v1.specialNotes,
  };

  const foodBeverageShared = {
    ingredients: v1.ingredients,
    allergens: v1.allergens,
    region: v1.region,
    producer: v1.producer,
    tastingNotes: v1.tastingNotes,
    servingTemp: v1.servingTemp,
    foodPairings: v1.foodPairings,
  };

  switch (v1.category) {
    case 'maki':
      return {
        ...base,
        category: 'maki',
        topping: v1.topping,
        base: v1.base,
        sauce: v1.sauce,
        paper: v1.paper,
        gluten: v1.gluten,
      };

    case 'wine':
      return {
        ...base,
        ...foodBeverageShared,
        category: 'wine',
        abv: v1.abv,
        vintage: v1.vintage,
        grapeVarieties: v1.grapeVarieties,
      };

    case 'beer':
      return {
        ...base,
        ...foodBeverageShared,
        category: 'beer',
        abv: v1.abv,
      };

    case 'cocktail':
      return {
        ...base,
        ...foodBeverageShared,
        category: 'cocktail',
        abv: v1.abv,
      };

    case 'spirit':
      return {
        ...base,
        ...foodBeverageShared,
        category: 'spirit',
        abv: v1.abv,
      };

    case 'non-alcoholic':
      return {
        ...base,
        ...foodBeverageShared,
        category: 'non-alcoholic',
      };

    case 'food':
      return {
        ...base,
        ...foodBeverageShared,
        category: 'food',
      };
  }
}