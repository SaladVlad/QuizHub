#!/bin/bash

# QuizHub Cleanup Script
# Removes all QuizHub resources from Kubernetes

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}QuizHub Cleanup Script${NC}"
echo ""

echo -e "${RED}This will delete:${NC}"
echo "  - All QuizHub microservices"
echo "  - All databases and their data"
echo "  - All observability stack components"
echo ""

read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${GREEN}Cleanup cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Deleting QuizHub resources...${NC}"

# Delete namespaces (this deletes everything in them)
kubectl delete namespace quizhub 2>/dev/null && echo -e "${GREEN}✓ Deleted quizhub namespace${NC}" || echo "  → quizhub namespace not found"
kubectl delete namespace databases 2>/dev/null && echo -e "${GREEN}✓ Deleted databases namespace${NC}" || echo "  → databases namespace not found"
kubectl delete namespace observability 2>/dev/null && echo -e "${GREEN}✓ Deleted observability namespace${NC}" || echo "  → observability namespace not found"

echo ""
echo -e "${GREEN}Cleanup complete!${NC}"
echo ""
echo -e "${YELLOW}Note: Minikube cluster is still running.${NC}"
echo "To delete the entire cluster, run:"
echo -e "  ${RED}minikube delete${NC}"
echo ""
echo "To remove from /etc/hosts:"
echo -e "  ${YELLOW}sudo sed -i '/quizhub.local/d' /etc/hosts${NC}"
