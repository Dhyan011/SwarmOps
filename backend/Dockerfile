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

# Expose port (Render uses PORT env variable or defaults to 10000/8000 depending on config, but standard is 8000)
ENV PORT=8000
EXPOSE 8000

# Start FastAPI server via uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
