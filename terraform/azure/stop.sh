#!/bin/bash

# QuizHub Azure AKS Stop Script
# This script stops the AKS cluster to save costs while preserving all resources

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
echo "║         QuizHub Azure AKS Stop Script                    ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}[1/3] Checking prerequisites...${NC}"
command -v terraform >/dev/null 2>&1 || { echo -e "${RED}Error: terraform is not installed${NC}" >&2; exit 1; }
command -v az >/dev/null 2>&1 || { echo -e "${RED}Error: azure-cli is not installed${NC}" >&2; exit 1; }
echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Check if terraform state exists
if [ ! -f "terraform.tfstate" ]; then
    echo -e "${RED}Error: No terraform.tfstate found. Have you deployed the infrastructure?${NC}"
    exit 1
fi

# Get cluster information
echo -e "${YELLOW}[2/3] Getting cluster information...${NC}"
RESOURCE_GROUP=$(terraform output -raw resource_group_name 2>/dev/null)
CLUSTER_NAME=$(terraform output -raw aks_cluster_name 2>/dev/null)

if [ -z "$RESOURCE_GROUP" ] || [ -z "$CLUSTER_NAME" ]; then
    echo -e "${RED}Error: Could not retrieve cluster information from Terraform state${NC}"
    exit 1
fi

echo -e "${BLUE}Resource Group: ${RESOURCE_GROUP}${NC}"
echo -e "${BLUE}Cluster Name: ${CLUSTER_NAME}${NC}"
echo ""

# Confirm action
echo -e "${YELLOW}⚠️  WARNING: This will stop the AKS cluster${NC}"
echo -e "${YELLOW}The cluster will be stopped but all resources will be preserved.${NC}"
echo -e "${YELLOW}You will continue to incur storage and IP costs, but not compute costs.${NC}"
echo ""
read -p "Are you sure you want to stop the cluster? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${BLUE}Operation cancelled.${NC}"
    exit 0
fi

# Stop AKS cluster
echo -e "${YELLOW}[3/3] Stopping AKS cluster...${NC}"
echo -e "${YELLOW}This may take 2-5 minutes...${NC}"
az aks stop --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME"
echo -e "${GREEN}✓ Cluster stopped${NC}"
echo ""

# Display summary
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                   Cluster Stopped! ⏸️                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Summary:${NC}"
echo -e "- AKS cluster ${CLUSTER_NAME} has been stopped"
echo -e "- All resources (ACR, VNet, Public IPs) are preserved"
echo -e "- You are no longer paying for VM compute costs"
echo -e "- You still pay for: Storage, Public IPs, Log Analytics"
echo ""

echo -e "${YELLOW}Cost Information:${NC}"
echo -e "Estimated savings: ~90% of running costs"
echo -e "Remaining costs: Storage (~\$5/month), Public IP (~\$3/month)"
echo ""

echo -e "${GREEN}To restart the cluster:${NC}"
echo -e "   ${BLUE}az aks start --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME${NC}"
echo ""

echo -e "${YELLOW}To completely remove all resources and stop all costs:${NC}"
echo -e "   ${BLUE}./destroy.sh${NC}"
echo ""

echo -e "${GREEN}Operation completed successfully! ✓${NC}"
