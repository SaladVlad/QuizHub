#!/bin/bash

# Build script for QuizHub Docker images
# This script builds all microservice images inside Minikube's Docker daemon

set -e  # Exit on error

echo "=================================="
echo "Building QuizHub Docker Images"
echo "=================================="
echo ""

# Point Docker to Minikube's daemon
echo "Configuring Docker to use Minikube's daemon..."
eval $(minikube docker-env)
echo "✓ Docker configured"
echo ""

# Go to root directory
cd ../../

# Build Gateway
echo "[1/5] Building Gateway..."
cd Services/Gateway/Gateway.Api
docker build -t quizhub/gateway:latest .
echo "✓ Gateway image built"
echo ""
cd ../../..

# Build UserService
echo "[2/5] Building UserService..."
cd Services/UserService/UserService.Api
docker build -t quizhub/user-service:latest .
echo "✓ UserService image built"
echo ""
cd ../../..

# Build QuizService
echo "[3/5] Building QuizService..."
cd Services/QuizService/QuizService.Api
docker build -t quizhub/quiz-service:latest .
echo "✓ QuizService image built"
echo ""
cd ../../..

# Build ResultService
echo "[4/5] Building ResultService..."
cd Services/ResultService/ResultService.Api
docker build -t quizhub/result-service:latest .
echo "✓ ResultService image built"
echo ""
cd ../../..

# Build Frontend
echo "[5/5] Building Frontend..."
if [ -d "frontend" ] && [ -f "frontend/Dockerfile" ]; then
  cd frontend
  docker build -t quizhub/frontend:latest .
  echo "✓ Frontend image built"
  cd ..
else
  echo "⚠ Frontend Dockerfile not found, skipping..."
fi
echo ""

echo "=================================="
echo "Build Summary"
echo "=================================="
docker images | grep quizhub

echo ""
echo "✅ All images built successfully!"
echo ""
echo "Images are stored in Minikube's Docker daemon."
echo "When creating Kubernetes manifests, use: imagePullPolicy: Never"
