FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY web-dashboard/package*.json ./

# Install all dependencies
RUN npm ci

# Copy shared types first (needed by web-dashboard)
COPY shared/ ../shared/

# Copy source code
COPY web-dashboard/ .

EXPOSE 3000

# Use development mode to avoid build issues
CMD ["npm", "run", "dev"]