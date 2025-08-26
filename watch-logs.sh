#!/bin/bash

# Colors for different services
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run service and capture logs
run_service() {
    local service=$1
    local port=$2
    local color=$3
    
    cd $service
    npm run dev 2>&1 | while IFS= read -r line; do
        echo -e "${color}[${service}:${port}]${NC} $line"
    done &
    cd ..
}

echo "Starting all services with log aggregation..."

# Start services in background with colored output
run_service "web-api" "3001" "$RED"
run_service "mobile-api" "3002" "$GREEN" 
run_service "web-dashboard" "3000" "$BLUE"

# Wait for all background processes
wait