// Shared types for 5StarMemo BFF Architecture

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  announcements?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Bulletin board curation: each restaurant maintains four curated lists
// (Specials, New items, Featured, In season) shown on the dashboard and
// consumed by the mobile app. Each list holds cards or decks.
export type CurationKind = 'specials' | 'new_item' | 'featured' | 'in_season';
export type CurationTargetType = 'card' | 'deck';

// Per-card mastery bucket derived from the student's FSRS state, matching the
// weak/learning/mastered classification used on StudentDeck. Cards the student
// has never reviewed roll into 'weak' (same as the deck-list bucket math).
export type MasteryLevel = 'weak' | 'learning' | 'mastered';

export interface RestaurantCurationItem {
  targetType: CurationTargetType;
  targetId: string;
  name: string;       // card itemName | deck title
  deckId?: string;    // present when targetType === 'card'
  deckTitle?: string; // present when targetType === 'card'
  imageUrl?: string;  // card image | deck cover (first card with an image)
  category?: RestaurantCategory; // present when targetType === 'card'
  mastery?: MasteryLevel; // present when targetType === 'card' and the payload
                          // is built for a specific student (mobile bulletin)
}

// Read-only payload served to the student mobile app for the bulletin tab.
export interface BulletinPayload {
  restaurant: Pick<Restaurant, 'id' | 'name' | 'slug' | 'announcements'>;
  curations: Record<CurationKind, RestaurantCurationItem[]>;
}

// One studyable unit inside a curation section. A 'card' unit always has a
// single card; a 'deck' unit has every card in that deck. The client shuffles
// units (and cards within deck units) before flattening into a single queue,
// and draws progress-bar ticks at unit boundaries.
export interface CurationStudyUnit {
  type: CurationTargetType;
  targetId: string;
  title: string;
  cards: StudyCardData[];
}

export interface CurationStudyPayload {
  kind: CurationKind;
  units: CurationStudyUnit[];
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'student' | 'management';
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  role: 'student' | 'management';
  roleIds?: string[];
  deckIds?: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
  // The session's active restaurant — present on student (mobile) login,
  // absent on management (web) login. Today a user belongs to exactly one;
  // when multi-restaurant lands this becomes the active selection.
  restaurant?: Pick<Restaurant, 'id' | 'name'>;
}

// Admin-assigned deck type, picked from a dropdown when a deck is created.
// Splits the menu into Food / Bar; 'other' covers mixed or not-yet-sorted decks.
export type DeckType = 'food' | 'bar' | 'other';

export interface Deck {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  deckType: DeckType;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  cards?: Card[];
  cardCount?: number;
  cardCategories?: string[]; // distinct restaurant_data.category values across the deck's cards
}

export interface CreateDeckInput {
  title: string;
  description?: string;
  categoryId?: string;
  deckType: DeckType;
}

export interface UpdateDeckInput extends Partial<CreateDeckInput> {}

export interface Card {
  id: string;
  deckId: string;
  imageUrl?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  restaurantData?: RestaurantCardData;
}

// Helper types for discriminated union
export type RestaurantCategory = 'wine' | 'beer' | 'cocktail' | 'spirit' | 'maki' | 'sake' | 'sauce' | 'fish' | 'dietary' | 'starters' | 'sashimi';
export type PricePoint = 'not-specified' | 'budget' | 'mid-range' | 'premium' | 'luxury';

// V2: Discriminated Union Architecture
// Base fields that apply to ALL categories
interface BaseRestaurantCardData {
  itemName: string;
  category: RestaurantCategory;
  description?: string;
  pricePoint?: PricePoint;
  price?: string;
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
    tanninLevel?: number;    // 1 = Smooth, 5 = Tannic
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
    classification?: string;
    vintage?: number;
    riceVariety?: string;
  };

export type SauceCardData = BaseRestaurantCardData & {
  category: 'sauce';
  ingredients?: string[];
};

export type FishCardData = BaseRestaurantCardData & {
  category: 'fish';
  taste?: string;
  country?: string;
};

export type DietaryCardData = BaseRestaurantCardData & {
  category: 'dietary';
  starters?: string;
  sashimi?: string;
  nigiri?: string;
  maki?: string;
};

export type StartersCardData = BaseRestaurantCardData & {
  category: 'starters';
  ingredients?: string[];
  allergens?: string[];
};

export type SashimiCardData = BaseRestaurantCardData & {
  category: 'sashimi';
  ingredients?: string[];
  allergens?: string[];
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
  | SauceCardData
  | FishCardData
  | DietaryCardData
  | StartersCardData
  | SashimiCardData;

// Flat (all-fields) shape used by the management form to collect input before
// stripping to category-specific fields via migrateToV2().
export interface RestaurantCardDataV1 {
  itemName: string;
  category: 'wine' | 'beer' | 'cocktail' | 'spirit' | 'maki' | 'sake' | 'sauce' | 'fish' | 'dietary' | 'starters' | 'sashimi';
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
  tanninLevel?: number;
  tastingNotes?: string[];
  servingTemp?: string;
  foodPairings?: string[];
  pricePoint?: 'not-specified' | 'budget' | 'mid-range' | 'premium' | 'luxury';
  price?: string;
  specialNotes?: string;
  topping?: string;
  base?: string;
  sauce?: string;
  paper?: string;
  gluten?: 'yes' | 'no' | 'optional';
  classification?: string;
  riceVariety?: string;
  alcohol?: string[];
  other?: string[];
  garnish?: string;
  taste?: string;
  country?: string;
  starters?: string;
  sashimi?: string;
  nigiri?: string;
  maki?: string;
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
  deckId: string | null;
  curationKind: CurationKind | null;
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

// ============================================
// Students, roles, and deck access (Users tab)
// ============================================

export interface StudentRoleSummary {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  deckCount: number;
}

export interface StudentRoleDetail extends StudentRoleSummary {
  members: Array<{ id: string; username: string; email: string }>;
  decks: Array<{ id: string; title: string }>;
}

export interface CreateStudentRoleInput {
  name: string;
  description?: string;
}

export interface UpdateStudentRoleInput extends Partial<CreateStudentRoleInput> {}

export interface UserListItem {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  roles: Array<{ id: string; name: string }>;
  directDeckCount: number;
  totalAccessibleDeckCount: number;
}

export interface UserDetail {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<{ id: string; name: string }>;
  directDecks: Array<{ id: string; title: string }>;
  // Decks the student inherits via roles. Includes the originating role so
  // the dashboard can group/explain access in the UI.
  roleDecks: Array<{ id: string; title: string; viaRoleId: string; viaRoleName: string }>;
}

export interface DeckAccess {
  roles: Array<{ id: string; name: string }>;
  users: Array<{ id: string; username: string; email: string }>;
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
  deckType: DeckType;
  cardCount: number;
  masteredCards: number;
  learningCards: number;
  weakCards: number;
  nextReviewAt?: Date;
}

export interface StudyCardData {
  card: Card;
  fsrsData: FSRSCard;
  isNew: boolean;
}

export interface StudyCardSearchResult {
  cardId: string;
  deckId: string;
  deckTitle: string;
  itemName: string;
  cardData: StudyCardData;
}

// ============================================
// Glossary Types
// ============================================

export type GlossarySection = 'glossary' | 'encyclopedia';

export interface GlossaryCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  displayOrder: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  termCount?: number; // Optional count for list views
}

export interface CreateGlossaryCategoryInput {
  name: string;
  description?: string;
  color?: string;
  displayOrder?: number;
}

export interface UpdateGlossaryCategoryInput extends Partial<CreateGlossaryCategoryInput> {}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  section: GlossarySection;
  categoryId?: string;
  category?: GlossaryCategory; // Populated in joined queries
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  linkedCards?: GlossaryTermCard[]; // Populated when fetching term details
  linkedCardCount?: number; // For list views
}

export interface CreateGlossaryTermInput {
  term: string;
  definition: string;
  section?: GlossarySection;
  categoryId?: string;
}

export interface UpdateGlossaryTermInput extends Partial<CreateGlossaryTermInput> {}

export interface GlossaryTermCard {
  id: string;
  termId: string;
  cardId: string;
  matchField?: string;
  matchContext?: string;
  createdAt: Date;
  card?: Card; // Populated in joined queries
}

export interface LinkTermToCardInput {
  termId: string;
  cardId: string;
  matchField?: string;
  matchContext?: string;
}

// Auto-suggestion types for term-card linking
export interface CardMatchSuggestion {
  cardId: string;
  card: Card;
  matchField: string;
  matchContext: string;
  matchScore: number; // 0-100, higher = better match
}

export interface TermSuggestionResponse {
  suggestions: CardMatchSuggestion[];
  totalMatches: number;
}

// Mobile-specific simplified types
export interface GlossaryTermSummary {
  id: string;
  term: string;
  definition: string;
  section: GlossarySection;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  linkedCardCount: number;
}

export interface GlossaryBrowseFilters {
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
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

export function isFishCard(data: RestaurantCardData): data is FishCardData {
  return data.category === 'fish';
}

export function isDietaryCard(data: RestaurantCardData): data is DietaryCardData {
  return data.category === 'dietary';
}

export function isStartersCard(data: RestaurantCardData): data is StartersCardData {
  return data.category === 'starters';
}

export function isSashimiCard(data: RestaurantCardData): data is SashimiCardData {
  return data.category === 'sashimi';
}

export function isAlcoholicCard(
  data: RestaurantCardData
): data is WineCardData | BeerCardData | CocktailCardData | SpiritCardData | SakeCardData {
  return ['wine', 'beer', 'cocktail', 'spirit', 'sake'].includes(data.category);
}

// Strip a flat all-fields object down to only category-valid fields
export function migrateToV2(v1: RestaurantCardDataV1): RestaurantCardData {
  const base = {
    itemName: v1.itemName,
    category: v1.category,
    description: v1.description,
    pricePoint: v1.pricePoint,
    price: v1.price,
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
        tanninLevel: v1.tanninLevel,
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
        classification: v1.classification,
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

    case 'fish':
      return {
        ...base,
        category: 'fish',
        taste: v1.taste,
        country: v1.country,
      };

    case 'dietary':
      return {
        ...base,
        category: 'dietary',
        starters: v1.starters,
        sashimi: v1.sashimi,
        nigiri: v1.nigiri,
        maki: v1.maki,
      };

    case 'starters':
      return {
        ...base,
        category: 'starters',
        ingredients: v1.ingredients,
        allergens: v1.allergens,
      };

    case 'sashimi':
      return {
        ...base,
        category: 'sashimi',
        ingredients: v1.ingredients,
        allergens: v1.allergens,
      };
  }
}
