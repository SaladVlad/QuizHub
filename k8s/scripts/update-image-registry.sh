#!/bin/bash

# QuizHub - Update Image Registry for AKS Migration
# This script updates all Kubernetes deployment manifests to use Azure Container Registry

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}Error: ACR login server not provided${NC}"
    echo "Usage: $0 <acr-login-server>"
    echo "Example: $0 quizhubacr.azurecr.io"
    exit 1
fi

ACR_LOGIN_SERVER=$1
K8S_DIR="/home/dis/Documents/Faks/QuizHub/k8s"

echo -e "${GREEN}=== Updating Image Registry to ${ACR_LOGIN_SERVER} ===${NC}\n"

# Function to update image in YAML files
update_image() {
    local file=$1
    local service=$2
    local image_name=$3
    
    if [ -f "$file" ]; then
        echo -e "${YELLOW}Updating ${file}...${NC}"
        sed -i "s|image:.*${image_name}.*|image: ${ACR_LOGIN_SERVER}/quizhub-${image_name}:latest|g" "$file"
        echo -e "${GREEN}✓ Updated${NC}"
    else
        echo -e "${RED}✗ File not found: ${file}${NC}"
    fi
}

# Update Gateway
update_image "${K8S_DIR}/services/gateway/gateway-deployment.yaml" "gateway" "gateway"

# Update User Service
update_image "${K8S_DIR}/services/user-service/user-service-deployment.yaml" "user-service" "user-service"

# Update Quiz Service
update_image "${K8S_DIR}/services/quiz-service/quiz-service-deployment.yaml" "quiz-service" "quiz-service"

# Update Result Service
update_image "${K8S_DIR}/services/result-service/result-service-deployment.yaml" "result-service" "result-service"

# Update Frontend
update_image "${K8S_DIR}/frontend/frontend-deployment.yaml" "frontend" "frontend"

echo -e "\n${GREEN}=== Image Registry Update Complete ===${NC}"
echo -e "${YELLOW}Please review the changes before applying to the cluster${NC}"
echo -e "\nUpdated files:"
echo "  - k8s/services/gateway/gateway-deployment.yaml"
echo "  - k8s/services/user-service/user-service-deployment.yaml"
echo "  - k8s/services/quiz-service/quiz-service-deployment.yaml"
echo "  - k8s/services/result-service/result-service-deployment.yaml"
echo "  - k8s/frontend/frontend-deployment.yaml"
