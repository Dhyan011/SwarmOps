# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
# Copy ALL frontend source first — this ensures any src change busts the install cache
COPY frontend/ .
RUN npm install && npm run build

# Stage 2: Build Python Backend
FROM python:3.11-slim

# Install git since SwarmOps agents need it to clone repositories
RUN apt-get update && \
    apt-get install -y git && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements from the backend folder
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source code
COPY backend/ .

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Expose port
ENV PORT=8000
EXPOSE 8000

# Start FastAPI server via uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
