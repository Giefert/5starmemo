# 5StarMemo - Backend-for-Frontend Architecture

A spaced repetition learning platform rebuilt with a Backend-for-Frontend (BFF) architecture, separating management and student interfaces for optimal user experience.

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
            │   (PostgreSQL)  │
            └─────────────────┘
```

## Project Structure

```
5starmemo/
├── web-api/          # Management API (Express.js + TypeScript)
├── mobile-api/       # Student consumption API (Coming soon)
├── web-dashboard/    # React management interface (Next.js)
├── mobile-app/       # React Native student app (Coming soon)
├── shared/           # Shared types and utilities
├── database/         # Database schema and migrations
└── README.md
```

## Current Implementation Status

✅ **Completed:**
- Web API with Express.js and TypeScript
- PostgreSQL database schema
- Authentication system for management users
- Core CRUD endpoints for deck management
- Web Dashboard with Next.js and Tailwind CSS
- Management login interface
- Deck creation and editing forms
- Card management within decks

🚧 **Coming Next:**
- Mobile API for student consumption
- React Native mobile app
- FSRS algorithm implementation
- Image support for cards
- Analytics and progress tracking

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb 5starmemo

# Run the schema
psql 5starmemo < database/schema.sql
```

### 2. Web API Setup

```bash
cd web-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=5starmemo
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your-super-secret-jwt-key

# Start development server
npm run dev
```

The Web API will be available at `http://localhost:3001`

### 3. Web Dashboard Setup

```bash
cd web-dashboard

# Install dependencies
npm install

# Create .env.local for Next.js
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

# Start development server
npm run dev
```

The Web Dashboard will be available at `http://localhost:3000`

### 4. Create Your First Management User

You'll need to create a management user to access the dashboard. You can do this via API call:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin",
    "password": "securepassword123",
    "role": "management"
  }'
```

Then login at `http://localhost:3000/login` with your credentials.

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new management user
- `POST /api/auth/login` - Login management user

### Deck Management Endpoints

All deck endpoints require authentication with `Authorization: Bearer <token>` header.

- `GET /api/decks` - Get all decks for authenticated user
- `GET /api/decks/:id` - Get specific deck with cards
- `POST /api/decks` - Create new deck
- `PUT /api/decks/:id` - Update deck
- `DELETE /api/decks/:id` - Delete deck

### Card Management Endpoints

- `POST /api/decks/:id/cards` - Add card to deck
- `PUT /api/decks/cards/:cardId` - Update card
- `DELETE /api/decks/cards/:cardId` - Delete card

## Features

### Web Dashboard (Management Interface)

- **Authentication**: Secure login for management users
- **Deck Management**: Create, edit, and delete flashcard decks
- **Card Management**: Add, edit, and delete cards within decks
- **Visibility Control**: Make decks public or private
- **Dashboard Overview**: View deck statistics and recent activity

### Web API Features

- **Role-based Authentication**: JWT-based auth with management/student roles
- **Data Validation**: Comprehensive input validation with express-validator
- **Security**: Helmet, CORS, and rate limiting
- **Database**: PostgreSQL with connection pooling
- **Error Handling**: Consistent error responses and logging

## Technology Stack

### Backend (Web API)
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with pg driver
- **Authentication**: JWT with bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS, express-rate-limit

### Frontend (Web Dashboard)
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **UI Components**: Custom components with Radix UI primitives
- **Icons**: Lucide React

### Database
- **Primary Database**: PostgreSQL
- **Schema**: Optimized for both creation and consumption workflows
- **Features**: UUID primary keys, timestamps, indexes for performance

## Development

### Running Tests

```bash
# Web API tests (when implemented)
cd web-api
npm test

# Web Dashboard tests (when implemented)  
cd web-dashboard
npm test
```

### Building for Production

```bash
# Build Web API
cd web-api
npm run build

# Build Web Dashboard
cd web-dashboard
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Next Steps

1. **Mobile API**: Implement student-focused consumption API
2. **Mobile App**: Create React Native app for students
3. **FSRS Integration**: Implement spaced repetition algorithm
4. **Image Support**: Add image upload and display for cards
5. **Analytics**: Add learning analytics and progress tracking
6. **Bulk Operations**: Import/export cards from CSV or other formats

## License

MIT License - see LICENSE file for details