FROM node:18-alpine

WORKDIR /app

# Set up the monorepo structure
COPY shared/ ../shared/
COPY mobile-api/package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY mobile-api/ .

# Build the application
RUN npm run build

EXPOSE 3002

CMD ["npm", "start"]