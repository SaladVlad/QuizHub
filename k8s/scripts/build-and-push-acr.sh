#!/bin/bash

# QuizHub - Build and Push Images to ACR
# This script builds all Docker images and pushes them to Azure Container Registry

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}Error: ACR login server not provided${NC}"
    echo "Usage: $0 <acr-login-server>"
    echo "Example: $0 quizhubacr.azurecr.io"
    exit 1
fi

ACR_LOGIN_SERVER=$1
PROJECT_ROOT="/home/dis/Documents/Faks/QuizHub"

echo -e "${GREEN}=== Building and Pushing QuizHub Images to ${ACR_LOGIN_SERVER} ===${NC}\n"

# Check if logged into ACR
echo -e "${YELLOW}Checking ACR login...${NC}"
if ! docker info | grep -q "Registry:"; then
    echo -e "${RED}Not logged into Docker. Please run: az acr login --name <acr-name>${NC}"
    exit 1
fi

cd "$PROJECT_ROOT"

# Function to build and push image
build_and_push() {
    local service_name=$1
    local dockerfile_path=$2
    local image_tag="${ACR_LOGIN_SERVER}/quizhub-${service_name}:latest"
    local version_tag="${ACR_LOGIN_SERVER}/quizhub-${service_name}:$(date +%Y%m%d-%H%M%S)"
    
    echo -e "\n${BLUE}=== Building ${service_name} ===${NC}"
    echo -e "${YELLOW}Path: ${dockerfile_path}${NC}"
    
    if [ ! -f "${dockerfile_path}/Dockerfile" ]; then
        echo -e "${RED}✗ Dockerfile not found at ${dockerfile_path}${NC}"
        return 1
    fi
    
    # Build image
    docker build -t "$image_tag" -t "$version_tag" "$dockerfile_path"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Build successful${NC}"
        
        # Push latest tag
        echo -e "${YELLOW}Pushing ${image_tag}...${NC}"
        docker push "$image_tag"
        
        # Push version tag
        echo -e "${YELLOW}Pushing ${version_tag}...${NC}"
        docker push "$version_tag"
        
        echo -e "${GREEN}✓ ${service_name} pushed successfully${NC}"
    else
        echo -e "${RED}✗ Build failed for ${service_name}${NC}"
        return 1
    fi
}

# Build and push all services
build_and_push "gateway" "Services/Gateway/Gateway.Api"
build_and_push "user-service" "Services/UserService/UserService.Api"
build_and_push "quiz-service" "Services/QuizService/QuizService.Api"
build_and_push "result-service" "Services/ResultService/ResultService.Api"
build_and_push "frontend" "frontend"

echo -e "\n${GREEN}=== All Images Built and Pushed Successfully ===${NC}"
echo -e "\n${YELLOW}Pushed images:${NC}"
echo "  - ${ACR_LOGIN_SERVER}/quizhub-gateway:latest"
echo "  - ${ACR_LOGIN_SERVER}/quizhub-user-service:latest"
echo "  - ${ACR_LOGIN_SERVER}/quizhub-quiz-service:latest"
echo "  - ${ACR_LOGIN_SERVER}/quizhub-result-service:latest"
echo "  - ${ACR_LOGIN_SERVER}/quizhub-frontend:latest"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Update Kubernetes manifests: ./k8s/scripts/update-image-registry.sh ${ACR_LOGIN_SERVER}"
echo "2. Apply manifests to AKS cluster"
