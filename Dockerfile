# Use Node.js 20 as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (will be configurable via docker-compose)
EXPOSE ${PORT:-3010}

# Start the application
CMD ["npm", "run", "start:prod"]
