#!/bin/bash

# QuizHub Status Check Script
# Shows the current state of all QuizHub components

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              QuizHub Kubernetes Status                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check Minikube
echo -e "${YELLOW}📦 Minikube Cluster:${NC}"
minikube status
echo ""

# Check namespaces
echo -e "${YELLOW}📂 Namespaces:${NC}"
kubectl get namespaces | grep -E "(NAME|quizhub|databases|observability)"
echo ""

# Check pods in all namespaces
echo -e "${YELLOW}🚀 Pods Status:${NC}"
echo ""
echo -e "${BLUE}Databases:${NC}"
kubectl get pods -n databases 2>/dev/null || echo "  → databases namespace not found"
echo ""
echo -e "${BLUE}QuizHub Services:${NC}"
kubectl get pods -n quizhub 2>/dev/null || echo "  → quizhub namespace not found"
echo ""
echo -e "${BLUE}Observability:${NC}"
kubectl get pods -n observability 2>/dev/null || echo "  → observability namespace not found"
echo ""

# Check services
echo -e "${YELLOW}🌐 Services:${NC}"
kubectl get svc -n quizhub 2>/dev/null || echo "  → No services in quizhub namespace"
echo ""

# Check ingress
echo -e "${YELLOW}🔀 Ingress:${NC}"
kubectl get ingress -n quizhub 2>/dev/null || echo "  → No ingress configured"
echo ""

# Check resource usage
echo -e "${YELLOW}📊 Resource Usage:${NC}"
echo ""
echo -e "${BLUE}Nodes:${NC}"
kubectl top nodes 2>/dev/null || echo "  → Metrics not available (metrics-server may not be ready)"
echo ""
echo -e "${BLUE}Pods (QuizHub):${NC}"
kubectl top pods -n quizhub 2>/dev/null || echo "  → Metrics not available"
echo ""

# Check PVCs
echo -e "${YELLOW}💾 Persistent Volume Claims:${NC}"
kubectl get pvc -n databases 2>/dev/null || echo "  → No PVCs found"
echo ""

# Access information
MINIKUBE_IP=$(minikube ip 2>/dev/null || echo "N/A")
echo -e "${YELLOW}🌍 Access Information:${NC}"
echo "  Minikube IP: ${GREEN}$MINIKUBE_IP${NC}"
echo "  Frontend:    ${GREEN}http://quizhub.local${NC} (add to /etc/hosts first)"
echo "  API Gateway: ${GREEN}http://quizhub.local/api${NC}"
echo ""
echo "  To add to /etc/hosts:"
echo -e "  ${BLUE}echo \"$MINIKUBE_IP quizhub.local\" | sudo tee -a /etc/hosts${NC}"
echo ""
