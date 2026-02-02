#!/bin/bash

# QuizHub Azure AKS Destroy Script
# This script completely destroys all Azure resources created by Terraform

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║        QuizHub Azure AKS Destroy Script                  ║"
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
    echo -e "${YELLOW}Warning: No terraform.tfstate found.${NC}"
    echo -e "${YELLOW}Either infrastructure was never deployed or state file is missing.${NC}"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Get cluster information (if available)
echo -e "${YELLOW}[2/3] Getting infrastructure information...${NC}"
if [ -f "terraform.tfstate" ]; then
    RESOURCE_GROUP=$(terraform output -raw resource_group_name 2>/dev/null || echo "unknown")
    CLUSTER_NAME=$(terraform output -raw aks_cluster_name 2>/dev/null || echo "unknown")
    ACR_NAME=$(terraform output -raw acr_name 2>/dev/null || echo "unknown")

    echo -e "${BLUE}Resource Group: ${RESOURCE_GROUP}${NC}"
    echo -e "${BLUE}Cluster Name: ${CLUSTER_NAME}${NC}"
    echo -e "${BLUE}ACR Name: ${ACR_NAME}${NC}"
    echo ""
else
    echo -e "${YELLOW}No state file available - cannot display resource information${NC}"
    echo ""
fi

# Show what will be destroyed
echo -e "${RED}⚠️  DANGER ZONE ⚠️${NC}"
echo -e "${RED}This will PERMANENTLY DELETE all resources including:${NC}"
echo -e "  • AKS Kubernetes cluster"
echo -e "  • Azure Container Registry (and all images)"
echo -e "  • Virtual Network and subnets"
echo -e "  • Public IP addresses"
echo -e "  • Log Analytics workspace (and all logs)"
echo -e "  • All data, configurations, and deployments"
echo ""
echo -e "${RED}THIS CANNOT BE UNDONE!${NC}"
echo ""

# First confirmation
read -p "Type 'destroy' to confirm you want to delete all resources: " -r
echo
if [[ ! $REPLY == "destroy" ]]; then
    echo -e "${BLUE}Operation cancelled. No resources were deleted.${NC}"
    exit 0
fi

# Second confirmation
echo -e "${YELLOW}Are you absolutely sure? This is your last chance to cancel.${NC}"
read -p "Type 'yes' to proceed with destruction: " -r
echo
if [[ ! $REPLY == "yes" ]]; then
    echo -e "${BLUE}Operation cancelled. No resources were deleted.${NC}"
    exit 0
fi

# Destroy infrastructure
echo -e "${RED}[3/3] Destroying infrastructure...${NC}"
echo -e "${YELLOW}This may take 5-10 minutes...${NC}"
echo ""

terraform destroy -auto-approve

echo ""
echo -e "${GREEN}✓ Infrastructure destroyed${NC}"
echo ""

# Display summary
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              All Resources Deleted!                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Summary:${NC}"
echo -e "- All Azure resources have been permanently deleted"
echo -e "- You are no longer incurring any costs for this infrastructure"
echo -e "- Terraform state has been updated"
echo ""

echo -e "${YELLOW}Cleanup:${NC}"
echo -e "Consider removing local files:"
echo -e "  • terraform.tfstate"
echo -e "  • terraform.tfstate.backup"
echo -e "  • .terraform/ directory"
echo -e "  • tfplan file"
echo ""

echo -e "${GREEN}To redeploy infrastructure:${NC}"
echo -e "   ${BLUE}./deploy.sh${NC}"
echo ""

echo -e "${GREEN}Destruction completed successfully! ✓${NC}"
