# Use Node.js 20 LTS as the base image
FROM node:20-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the frontend assets
RUN npm run build

# --- Production Image ---
FROM node:20-slim

WORKDIR /app

# Copy built assets and necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/index.html ./

# Set environment to production
ENV NODE_ENV=production

# TradeX runs on port 3000
EXPOSE 3000

# Start the server using tsx (as defined in package.json start script)
CMD ["npm", "run", "start"]
