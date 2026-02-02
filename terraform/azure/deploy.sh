#!/bin/bash

# QuizHub Azure AKS Deployment Script
# This script deploys the entire QuizHub infrastructure to Azure using Terraform

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║       QuizHub Azure AKS Deployment Script                ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}[1/7] Checking prerequisites...${NC}"
command -v terraform >/dev/null 2>&1 || { echo -e "${RED}Error: terraform is not installed${NC}" >&2; exit 1; }
command -v az >/dev/null 2>&1 || { echo -e "${RED}Error: azure-cli is not installed${NC}" >&2; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}Error: kubectl is not installed${NC}" >&2; exit 1; }
echo -e "${GREEN}✓ All prerequisites installed${NC}"
echo ""

# Check Azure login
echo -e "${YELLOW}[2/7] Checking Azure authentication...${NC}"
if ! az account show &>/dev/null; then
    echo -e "${YELLOW}Not logged in to Azure. Initiating login...${NC}"
    az login
fi
echo -e "${GREEN}✓ Authenticated with Azure${NC}"
echo ""

# Display current subscription
SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${BLUE}Current subscription: ${SUBSCRIPTION}${NC}"
read -p "Continue with this subscription? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Please select the correct subscription using:${NC}"
    echo -e "${BLUE}az account set --subscription <subscription-id>${NC}"
    exit 1
fi
echo ""

# Initialize Terraform
echo -e "${YELLOW}[3/7] Initializing Terraform...${NC}"
terraform init
echo -e "${GREEN}✓ Terraform initialized${NC}"
echo ""

# Validate Terraform configuration
echo -e "${YELLOW}[4/7] Validating Terraform configuration...${NC}"
terraform validate
echo -e "${GREEN}✓ Configuration valid${NC}"
echo ""

# Plan Terraform deployment
echo -e "${YELLOW}[5/7] Planning Terraform deployment...${NC}"
terraform plan -out=tfplan
echo -e "${GREEN}✓ Plan created${NC}"
echo ""

# Apply Terraform configuration
echo -e "${YELLOW}[6/7] Applying Terraform configuration...${NC}"
echo -e "${YELLOW}This will create resources in Azure and may take 10-15 minutes...${NC}"
terraform apply tfplan
echo -e "${GREEN}✓ Infrastructure deployed${NC}"
echo ""

# Configure kubectl
echo -e "${YELLOW}[7/7] Configuring kubectl...${NC}"
RESOURCE_GROUP=$(terraform output -raw resource_group_name)
CLUSTER_NAME=$(terraform output -raw aks_cluster_name)
az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --overwrite-existing
echo -e "${GREEN}✓ kubectl configured${NC}"
echo ""

# Display deployment information
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                 Deployment Complete!                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Deployment Summary:${NC}"
echo -e "${YELLOW}Resource Group:${NC} $RESOURCE_GROUP"
echo -e "${YELLOW}AKS Cluster:${NC} $CLUSTER_NAME"
echo -e "${YELLOW}ACR Registry:${NC} $(terraform output -raw acr_login_server)"
echo -e "${YELLOW}Ingress IP:${NC} $(terraform output -raw ingress_ip)"
echo ""

echo -e "${GREEN}Next Steps:${NC}"
echo -e "1. Build and push Docker images to ACR:"
echo -e "   ${BLUE}cd ../../k8s/scripts && ./build-and-push-acr.sh${NC}"
echo ""
echo -e "2. Deploy application to AKS:"
echo -e "   ${BLUE}kubectl apply -f ../../k8s/databases/${NC}"
echo -e "   ${BLUE}kubectl apply -f ../../k8s/services/${NC}"
echo -e "   ${BLUE}kubectl apply -f ../../k8s/frontend/${NC}"
echo -e "   ${BLUE}kubectl apply -f ../../k8s/observability/${NC}"
echo -e "   ${BLUE}kubectl apply -f ../../k8s/ingress/${NC}"
echo ""
echo -e "3. Monitor deployment:"
echo -e "   ${BLUE}kubectl get pods --all-namespaces -w${NC}"
echo ""
echo -e "4. Access your application at the Ingress IP above"
echo ""
echo -e "${YELLOW}Cost Management:${NC}"
echo -e "Remember to stop/destroy the cluster when not in use to save costs!"
echo -e "Run: ${BLUE}./stop.sh${NC} to stop cluster (preserves resources)"
echo -e "Run: ${BLUE}./destroy.sh${NC} to completely remove all resources"
echo ""

echo -e "${GREEN}Deployment completed successfully! 🚀${NC}"
