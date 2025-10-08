#!/bin/bash

# Complete QuizHub Kubernetes Setup Script
# This script sets up the entire QuizHub platform on Minikube

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║        QuizHub Kubernetes Complete Setup Script           ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}[1/8] Checking prerequisites...${NC}"
command -v minikube >/dev/null 2>&1 || { echo -e "${RED}Error: minikube is not installed${NC}" >&2; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}Error: kubectl is not installed${NC}" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Error: docker is not installed${NC}" >&2; exit 1; }
echo -e "${GREEN}✓ All prerequisites installed${NC}"
echo ""

# Check if Minikube is running
MINIKUBE_STATUS=$(minikube status --format='{{.Host}}' 2>/dev/null || echo "Stopped")

if [ "$MINIKUBE_STATUS" != "Running" ]; then
    echo -e "${YELLOW}[2/8] Starting Minikube cluster...${NC}"
    minikube start \
        --cpus=6 \
        --memory=12288 \
        --disk-size=50g \
        --driver=docker
    echo -e "${GREEN}✓ Minikube cluster started${NC}"
else
    echo -e "${YELLOW}[2/8] Minikube is already running${NC}"
    echo -e "${GREEN}✓ Using existing cluster${NC}"
fi
echo ""

# Enable addons
echo -e "${YELLOW}[3/8] Enabling Minikube addons...${NC}"
minikube addons enable ingress 2>/dev/null || echo "Ingress already enabled"
minikube addons enable metrics-server 2>/dev/null || echo "Metrics-server already enabled"
echo -e "${GREEN}✓ Addons enabled${NC}"
echo ""

# Create namespaces
echo -e "${YELLOW}[4/8] Creating namespaces...${NC}"
kubectl create namespace quizhub 2>/dev/null || echo "  → quizhub namespace already exists"
kubectl create namespace observability 2>/dev/null || echo "  → observability namespace already exists"
kubectl create namespace databases 2>/dev/null || echo "  → databases namespace already exists"
echo -e "${GREEN}✓ Namespaces ready${NC}"
echo ""

# Build Docker images
echo -e "${YELLOW}[5/8] Building Docker images...${NC}"
echo -e "${BLUE}This will take 3-5 minutes...${NC}"
./build-images.sh
echo ""

# Deploy databases
echo -e "${YELLOW}[6/8] Deploying SQL Server databases...${NC}"
kubectl apply -f ../databases/ >/dev/null
echo "  → Waiting for databases to be ready (max 2 minutes)..."
kubectl wait --for=condition=ready pod -l app=user-db -n databases --timeout=120s 2>/dev/null || echo "  ⚠ user-db took longer than expected"
kubectl wait --for=condition=ready pod -l app=quiz-db -n databases --timeout=120s 2>/dev/null || echo "  ⚠ quiz-db took longer than expected"
kubectl wait --for=condition=ready pod -l app=result-db -n databases --timeout=120s 2>/dev/null || echo "  ⚠ result-db took longer than expected"
echo -e "${GREEN}✓ Databases deployed${NC}"
echo ""

# Deploy microservices
echo -e "${YELLOW}[7/8] Deploying QuizHub microservices...${NC}"
if [ -d "../services/gateway" ]; then
    kubectl apply -f ../services/gateway/ >/dev/null && echo "  ✓ Gateway deployed"
fi
if [ -d "../services/user-service" ]; then
    kubectl apply -f ../services/user-service/ >/dev/null && echo "  ✓ UserService deployed"
fi
if [ -d "../services/quiz-service" ]; then
    kubectl apply -f ../services/quiz-service/ >/dev/null && echo "  ✓ QuizService deployed"
fi
if [ -d "../services/result-service" ]; then
    kubectl apply -f ../services/result-service/ >/dev/null && echo "  ✓ ResultService deployed"
fi
if [ -d "../frontend" ]; then
    kubectl apply -f ../frontend/ >/dev/null && echo "  ✓ Frontend deployed"
fi
echo "  → Waiting for services to be ready..."
sleep 10  # Give deployments time to create pods
kubectl wait --for=condition=ready pod --all -n quizhub --timeout=180s 2>/dev/null || echo "  ⚠ Some pods took longer than expected"
echo -e "${GREEN}✓ Microservices deployed${NC}"
echo ""

# Configure Ingress
echo -e "${YELLOW}[8/8] Configuring Ingress...${NC}"
if [ -f "../ingress/quizhub-ingress.yaml" ]; then
    kubectl apply -f ../ingress/ >/dev/null
    echo -e "${GREEN}✓ Ingress configured${NC}"
else
    echo -e "${YELLOW}⚠ Ingress manifest not found, skipping...${NC}"
fi
echo ""

# Final summary
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! 🎉                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}QuizHub is now running on Kubernetes!${NC}"
echo ""
echo -e "${YELLOW}📊 Cluster Status:${NC}"
kubectl get pods --all-namespaces -o wide
echo ""

echo -e "${YELLOW}🌐 Access Instructions:${NC}"
MINIKUBE_IP=$(minikube ip)
echo ""
echo "1. Add to /etc/hosts (Linux/Mac):"
echo -e "   ${BLUE}echo \"$MINIKUBE_IP quizhub.local\" | sudo tee -a /etc/hosts${NC}"
echo ""
echo "2. Access the application:"
echo -e "   Frontend:    ${GREEN}http://quizhub.local${NC}"
echo -e "   API Gateway: ${GREEN}http://quizhub.local/api${NC}"
echo ""
echo "Alternative (without /etc/hosts):"
echo -e "   ${BLUE}minikube service gateway -n quizhub --url${NC}"
echo ""

echo -e "${YELLOW}📚 Useful Commands:${NC}"
echo "  View pods:        kubectl get pods -n quizhub"
echo "  View logs:        kubectl logs -f deployment/gateway -n quizhub"
echo "  Resource usage:   kubectl top pods -n quizhub"
echo "  Access database:  kubectl exec -it user-db-0 -n databases -- bash"
echo ""

echo -e "${YELLOW}🧹 Cleanup:${NC}"
echo "  Delete all:       kubectl delete namespace quizhub databases"
echo "  Delete cluster:   minikube delete"
echo ""

echo -e "${GREEN}Happy testing! 🚀${NC}"