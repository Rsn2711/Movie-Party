FROM node:18-alpine

WORKDIR /app

# Copy package files and install root dependencies
COPY package*.json ./
RUN npm install

# Copy the entire project (including pre-built frontend)
COPY . .

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

EXPOSE $PORT

CMD ["node", "server.js"]
