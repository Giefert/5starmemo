# Study Material Platform: Backend-for-Frontend Migration Plan

## Previous App Situation
- Mobile app (Expo) with deck creation tools built in
- Single backend/API serving mobile app
- Two-tier authentication: regular users (students) and management
- Deck creation tools are difficult to fit properly in mobile interface

## Goal: Backend-for-Frontend (BFF) Architecture
Split into two optimized APIs while sharing the same database:
- **Mobile API**: Optimized for students consuming study materials
- **Web API**: Optimized for management creating/editing study materials

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │  Web Dashboard  │
│   (Students)    │    │  (Management)   │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          │                      │
┌─────────▼───────┐    ┌─────────▼───────┐
│   Mobile API    │    │    Web API      │
│ (Consumption)   │    │  (Creation)     │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
            ┌────────▼────────┐
            │  Shared Database │
            │                 │
            └─────────────────┘
```

## Implementation Plan

### Phase 1: Web API Setup (Week 1-2)
**Goal**: Create new web API for management features

#### Tasks:
1. **Set up Web API project**
   - Choose framework (Node.js/Express, Python/FastAPI, etc.)
   - Set up project structure
   - Configure environment variables

2. **Database connection**
   - Connect to existing database
   - Create/verify database schema for management operations
   - Set up database migrations if needed

3. **Management authentication**
   - Implement management login/logout
   - JWT token handling
   - Role-based access control
   - Session management

4. **Core deck management endpoints**
   ```
   POST   /api/decks              - Create new deck
   GET    /api/decks              - List all decks (management view)
   GET    /api/decks/:id          - Get specific deck details
   PUT    /api/decks/:id          - Update deck
   DELETE /api/decks/:id          - Delete deck
   
   POST   /api/decks/:id/cards    - Add card to deck
   PUT    /api/cards/:id          - Update card
   DELETE /api/cards/:id          - Delete card
   ```

### Phase 2: Web Dashboard Frontend (Week 2-3)
**Goal**: Build web interface for management

#### Tasks:
1. **Set up web dashboard project**
   - Create React/Next.js project
   - Set up routing
   - Configure build process

2. **Management authentication UI**
   - Login page
   - Protected routes
   - Session handling

3. **Deck creation interface**
   - Deck creation form
   - Card creation/editing interface
   - Drag & drop functionality
   - Bulk operations
   - File upload capabilities

4. **Deck management dashboard**
   - List all decks
   - Edit existing decks
   - Delete decks
   - User analytics (if needed)

### Phase 3: Mobile API Optimization (Week 3-4)
**Goal**: Optimize existing mobile API for pure consumption

#### Tasks:
1. **Refactor mobile API**
   - Remove all creation/editing endpoints
   - Optimize for fast read operations
   - Implement efficient caching

2. **Student-focused endpoints**
   ```
   GET /api/student/decks         - List available study decks
   GET /api/student/decks/:id     - Get deck for studying
   POST /api/student/progress     - Track study progress
   GET /api/student/progress      - Get study statistics
   ```

3. **Performance optimizations**
   - Add response caching
   - Optimize database queries
   - Compress responses for mobile

### Phase 4: Mobile App Cleanup (Week 4)
**Goal**: Remove creation features from mobile app

#### Tasks:
1. **Remove management features**
   - Delete all deck creation components
   - Remove management authentication
   - Clean up navigation

2. **Optimize for studying**
   - Improve study interface
   - Add offline capabilities
   - Optimize performance for consumption

3. **Update authentication**
   - Simplify to student-only login
   - Update API calls to mobile API endpoints

## Technical Specifications

### Authentication Strategy
- **Web API**: Full management authentication with role-based access
- **Mobile API**: Simple student authentication
- **Shared**: User data stored in same database with role differentiation

### Database Considerations
- **Shared schema**: Both APIs use same database tables
- **Coordination**: Ensure both APIs handle concurrent access properly
- **Migrations**: Web API handles schema changes, mobile API stays updated

### API Response Formats

**Web API (Management)**:
```json
{
  "deck": {
    "id": "123",
    "title": "Biology Basics",
    "description": "...",
    "cards": [...],
    "metadata": {
      "created_by": "user_id",
      "created_at": "timestamp",
      "last_modified": "timestamp",
      "study_statistics": {...}
    }
  }
}
```

**Mobile API (Students)**:
```json
{
  "deck": {
    "id": "123",
    "title": "Biology Basics",
    "cards": [
      {"question": "...", "answer": "..."},
      ...
    ]
  }
}
```

### Development Notes for Claude Code

#### Key Considerations:
1. **Database Schema**: Ensure both APIs work with the same database structure
2. **Error Handling**: Consistent error responses across both APIs
3. **Validation**: Input validation on both APIs, especially Web API for creation
4. **CORS**: Configure CORS properly for web dashboard
5. **Rate Limiting**: Implement appropriate rate limiting for each API

#### Suggested Tech Stack:
- **Web API**: Node.js/Express or Python/FastAPI
- **Mobile API**: Keep existing or match Web API technology
- **Web Dashboard**: React/Next.js
- **Database**: Keep existing (PostgreSQL/MySQL/MongoDB)
- **Authentication**: JWT tokens
- **File Storage**: Cloud storage for images/media if needed

#### Testing Strategy:
- Unit tests for both APIs
- Integration tests for database interactions
- E2E tests for critical workflows
- Load testing for mobile API (consumption-heavy)

## Success Metrics
- Web dashboard provides better UX for deck creation
- Mobile app is faster and simpler for studying
- Both systems can be developed/maintained independently
- No data conflicts between the two systems
- Easy to add features to either system without affecting the other

## Future Considerations
- **Analytics**: Separate analytics for creation vs consumption
- **Scaling**: Each API can scale independently based on usage
- **Feature Development**: New features can be added to appropriate API
- **Team Structure**: Different developers can work on each system

---

*This migration plan can be safely deleted once the BFF architecture implementation is complete.*
