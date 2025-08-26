FROM node:18-alpine

WORKDIR /app

# Set up the monorepo structure  
COPY shared/ ../shared/
COPY web-api/package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY web-api/ .

# Build the application
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]