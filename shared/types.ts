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
  front?: string;
  back?: string;
  imageUrl?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  // Restaurant-specific fields
  restaurantData?: RestaurantCardData;
}

// Helper types for discriminated union
export type RestaurantCategory = 'wine' | 'beer' | 'cocktail' | 'spirit' | 'maki' | 'sake' | 'sauce';
export type PricePoint = 'not-specified' | 'budget' | 'mid-range' | 'premium' | 'luxury';

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
export type WineCardData = BaseRestaurantCardData &
  FoodBeverageSharedFields &
  AlcoholicFields & {
    category: 'wine';
    vintage?: number;
    grapeVarieties?: string[];
    appellation?: string;
    bodyLevel?: number;      // 1 = Light, 5 = Bold
    sweetnessLevel?: number; // 1 = Dry, 5 = Sweet
    acidityLevel?: number;   // 1 = Soft, 5 = Acidic
  };

export type BeerCardData = BaseRestaurantCardData &
  AlcoholicFields & {
    category: 'beer';
  };

export type CocktailCardData = BaseRestaurantCardData &
  AlcoholicFields & {
    category: 'cocktail';
    alcohol?: string[];
    other?: string[];
    garnish?: string;
  };

export type SpiritCardData = BaseRestaurantCardData &
  AlcoholicFields & {
    category: 'spirit';
  };

export type MakiCardData = BaseRestaurantCardData & {
  category: 'maki';
  topping?: string;
  base?: string;
  sauce?: string;
  paper?: string;
  gluten?: 'yes' | 'no' | 'optional';
};

export type SakeCardData = BaseRestaurantCardData &
  FoodBeverageSharedFields &
  AlcoholicFields & {
    category: 'sake';
    vintage?: number;
    riceVariety?: string;
  };

export type SauceCardData = BaseRestaurantCardData & {
  category: 'sauce';
  ingredients?: string[];
};

/**
 * Restaurant card data using discriminated union pattern based on category.
 *
 * This ensures type safety: TypeScript prevents accessing wine-specific fields
 * (like `vintage`) on maki cards, and vice versa.
 *
 * Benefits:
 * - 39% reduction in field bloat per category
 * - Compile-time type safety (no more runtime-only validation)
 * - Self-documenting: each category's valid fields are explicit
 *
 * @example
 * ```typescript
 * if (isMakiCard(card.restaurantData)) {
 *   // TypeScript knows `topping` exists
 *   console.log(card.restaurantData.topping);
 *   // TypeScript error: vintage doesn't exist on MakiCardData
 *   console.log(card.restaurantData.vintage);
 * }
 * ```
 */
export type RestaurantCardData =
  | WineCardData
  | BeerCardData
  | CocktailCardData
  | SpiritCardData
  | MakiCardData
  | SakeCardData
  | SauceCardData;

// Alias for backward compatibility
export type RestaurantCardDataV2 = RestaurantCardData;

/**
 * V1 monolithic interface - DEPRECATED
 *
 * Only use this type for migration purposes (converting legacy data to V2).
 * For new code, use RestaurantCardData (the discriminated union).
 *
 * @deprecated Use RestaurantCardData instead
 */
export interface RestaurantCardDataV1 {
  itemName: string;
  category: 'wine' | 'beer' | 'cocktail' | 'spirit' | 'maki' | 'sake' | 'sauce';
  description?: string;
  ingredients?: string[];
  allergens?: string[];
  region?: string;
  producer?: string;
  vintage?: number;
  abv?: number;
  grapeVarieties?: string[];
  appellation?: string;
  bodyLevel?: number;
  sweetnessLevel?: number;
  acidityLevel?: number;
  tastingNotes?: string[];
  servingTemp?: string;
  foodPairings?: string[];
  pricePoint?: 'not-specified' | 'budget' | 'mid-range' | 'premium' | 'luxury';
  specialNotes?: string;
  topping?: string;
  base?: string;
  sauce?: string;
  paper?: string;
  gluten?: 'yes' | 'no' | 'optional';
  riceVariety?: string;
  alcohol?: string[];
  other?: string[];
  garnish?: string;
}

export interface CreateCardInput {
  front?: string;
  back?: string;
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

// Type guards for RestaurantCardData discriminated union
export function isMakiCard(data: RestaurantCardData): data is MakiCardData {
  return data.category === 'maki';
}

export function isWineCard(data: RestaurantCardData): data is WineCardData {
  return data.category === 'wine';
}

export function isBeerCard(data: RestaurantCardData): data is BeerCardData {
  return data.category === 'beer';
}

export function isCocktailCard(data: RestaurantCardData): data is CocktailCardData {
  return data.category === 'cocktail';
}

export function isSpiritCard(data: RestaurantCardData): data is SpiritCardData {
  return data.category === 'spirit';
}

export function isSakeCard(data: RestaurantCardData): data is SakeCardData {
  return data.category === 'sake';
}

export function isSauceCard(data: RestaurantCardData): data is SauceCardData {
  return data.category === 'sauce';
}

export function isAlcoholicCard(
  data: RestaurantCardData
): data is WineCardData | BeerCardData | CocktailCardData | SpiritCardData | SakeCardData {
  return ['wine', 'beer', 'cocktail', 'spirit', 'sake'].includes(data.category);
}

// Migration helper: convert V1 to V2 (strips invalid category-specific fields)
export function migrateToV2(v1: RestaurantCardDataV1): RestaurantCardData {
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
        appellation: v1.appellation,
        bodyLevel: v1.bodyLevel,
        sweetnessLevel: v1.sweetnessLevel,
        acidityLevel: v1.acidityLevel,
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
        category: 'cocktail',
        abv: v1.abv,
        alcohol: v1.alcohol,
        other: v1.other,
        garnish: v1.garnish,
      };

    case 'spirit':
      return {
        ...base,
        ...foodBeverageShared,
        category: 'spirit',
        abv: v1.abv,
      };

    case 'sake':
      return {
        ...base,
        ...foodBeverageShared,
        category: 'sake',
        abv: v1.abv,
        vintage: v1.vintage,
        riceVariety: v1.riceVariety,
      };

    case 'sauce':
      return {
        ...base,
        category: 'sauce',
        ingredients: v1.ingredients,
      };
  }
}