FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy app
COPY . .

# Expose ports
EXPOSE 19000 19001 8081

# Install and start (will run on container start due to volumes)
CMD ["sh", "-c", "npm install && npx expo start --web"]