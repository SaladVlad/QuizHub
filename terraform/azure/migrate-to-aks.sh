#!/bin/bash

# QuizHub - Complete AKS Migration Script
# This script performs the complete migration from local to AKS

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/home/dis/Documents/Faks/QuizHub"

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          QuizHub AKS Migration - Complete Setup               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}\n"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}Step 1: Checking Prerequisites${NC}"
echo -e "${YELLOW}───────────────────────────────${NC}"

MISSING_TOOLS=()

if ! command_exists az; then
    MISSING_TOOLS+=("azure-cli")
fi

if ! command_exists terraform; then
    MISSING_TOOLS+=("terraform")
fi

if ! command_exists kubectl; then
    MISSING_TOOLS+=("kubectl")
fi

if ! command_exists docker; then
    MISSING_TOOLS+=("docker")
fi

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo -e "${RED}✗ Missing required tools: ${MISSING_TOOLS[*]}${NC}"
    echo -e "${YELLOW}Please install missing tools before continuing.${NC}"
    echo "See terraform/azure/README.md for installation instructions."
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites installed${NC}\n"

# Check Azure login
echo -e "${BLUE}Step 2: Verifying Azure Login${NC}"
echo -e "${YELLOW}────────────────────────────────${NC}"

if ! az account show &>/dev/null; then
    echo -e "${YELLOW}Not logged into Azure. Please login:${NC}"
    az login
else
    SUBSCRIPTION=$(az account show --query "name" -o tsv)
    echo -e "${GREEN}✓ Logged in to Azure${NC}"
    echo -e "  Subscription: ${YELLOW}${SUBSCRIPTION}${NC}\n"
fi

# Configure Terraform variables
echo -e "${BLUE}Step 3: Configuring Terraform${NC}"
echo -e "${YELLOW}────────────────────────────────${NC}"

cd "$PROJECT_ROOT/terraform/azure"

if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}Creating terraform.tfvars from example...${NC}"
    cp terraform.tfvars.example terraform.tfvars
    
    echo -e "${RED}IMPORTANT: Edit terraform.tfvars to set a unique ACR name!${NC}"
    echo -e "${YELLOW}Press Enter when ready to continue, or Ctrl+C to exit and edit first${NC}"
    read -r
fi

echo -e "${GREEN}✓ Terraform configured${NC}\n"

# Initialize Terraform
echo -e "${BLUE}Step 4: Initializing Terraform${NC}"
echo -e "${YELLOW}─────────────────────────────────${NC}"

terraform init

echo -e "${GREEN}✓ Terraform initialized${NC}\n"

# Plan infrastructure
echo -e "${BLUE}Step 5: Planning Infrastructure${NC}"
echo -e "${YELLOW}─────────────────────────────────${NC}"

terraform plan -out=tfplan

echo -e "${GREEN}✓ Plan created${NC}\n"

# Apply infrastructure
echo -e "${BLUE}Step 6: Deploying Infrastructure${NC}"
echo -e "${YELLOW}──────────────────────────────────${NC}"
echo -e "${RED}This will create Azure resources and may take 10-15 minutes.${NC}"
echo -e "${YELLOW}Type 'yes' to continue:${NC} "
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

terraform apply tfplan

echo -e "${GREEN}✓ Infrastructure deployed${NC}\n"

# Get outputs
ACR_NAME=$(terraform output -raw acr_name)
ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server)
INGRESS_IP=$(terraform output -raw ingress_ip)

echo -e "${GREEN}Infrastructure Details:${NC}"
echo -e "  ACR Name: ${YELLOW}${ACR_NAME}${NC}"
echo -e "  ACR Server: ${YELLOW}${ACR_LOGIN_SERVER}${NC}"
echo -e "  Ingress IP: ${YELLOW}${INGRESS_IP}${NC}\n"

# Configure kubectl
echo -e "${BLUE}Step 7: Configuring kubectl${NC}"
echo -e "${YELLOW}────────────────────────────────${NC}"

eval "$(terraform output -raw configure_kubectl)"

kubectl get nodes

echo -e "${GREEN}✓ kubectl configured${NC}\n"

# Login to ACR
echo -e "${BLUE}Step 8: Logging into ACR${NC}"
echo -e "${YELLOW}────────────────────────────${NC}"

az acr login --name "$ACR_NAME"

echo -e "${GREEN}✓ Logged into ACR${NC}\n"

# Build and push images
echo -e "${BLUE}Step 9: Building and Pushing Images${NC}"
echo -e "${YELLOW}──────────────────────────────────────${NC}"

cd "$PROJECT_ROOT"
./k8s/scripts/build-and-push-acr.sh "$ACR_LOGIN_SERVER"

echo -e "${GREEN}✓ Images built and pushed${NC}\n"

# Update manifests
echo -e "${BLUE}Step 10: Updating Kubernetes Manifests${NC}"
echo -e "${YELLOW}───────────────────────────────────────${NC}"

./k8s/scripts/update-image-registry.sh "$ACR_LOGIN_SERVER"

echo -e "${GREEN}✓ Manifests updated${NC}\n"

# Deploy application
echo -e "${BLUE}Step 11: Deploying Application${NC}"
echo -e "${YELLOW}──────────────────────────────────${NC}"

cd "$PROJECT_ROOT/k8s"

# Deploy databases
echo -e "${YELLOW}Deploying databases...${NC}"
kubectl apply -f databases/

# Wait for databases
echo -e "${YELLOW}Waiting for databases to be ready...${NC}"
sleep 30

# Deploy services
echo -e "${YELLOW}Deploying services...${NC}"
kubectl apply -f services/gateway/
kubectl apply -f services/user-service/
kubectl apply -f services/quiz-service/
kubectl apply -f services/result-service/

# Deploy frontend
echo -e "${YELLOW}Deploying frontend...${NC}"
kubectl apply -f frontend/

# Deploy observability
echo -e "${YELLOW}Deploying observability stack...${NC}"
kubectl apply -f observability/elasticsearch.yaml
kubectl apply -f observability/kibana.yaml
kubectl apply -f observability/filebeat.yaml
kubectl apply -f observability/jaeger.yaml
kubectl apply -f observability/prometheus.yaml
kubectl apply -f observability/grafana.yaml

# Deploy ingress
echo -e "${YELLOW}Deploying ingress...${NC}"
kubectl apply -f ingress/

echo -e "${GREEN}✓ Application deployed${NC}\n"

# Configure DNS
echo -e "${BLUE}Step 12: Configuring Local DNS${NC}"
echo -e "${YELLOW}────────────────────────────────${NC}"

echo -e "${YELLOW}Adding entries to /etc/hosts...${NC}"
echo -e "${RED}This requires sudo password${NC}"

sudo bash -c "cat >> /etc/hosts << EOF
# QuizHub AKS
${INGRESS_IP} quizhub.local
${INGRESS_IP} grafana.quizhub.local
${INGRESS_IP} kibana.quizhub.local
${INGRESS_IP} prometheus.quizhub.local
${INGRESS_IP} jaeger.quizhub.local
EOF"

echo -e "${GREEN}✓ DNS configured${NC}\n"

# Final status check
echo -e "${BLUE}Step 13: Verifying Deployment${NC}"
echo -e "${YELLOW}───────────────────────────────${NC}"

echo -e "\n${YELLOW}Application Pods:${NC}"
kubectl get pods -n quizhub

echo -e "\n${YELLOW}Observability Pods:${NC}"
kubectl get pods -n observability

echo -e "\n${YELLOW}Services:${NC}"
kubectl get svc -n quizhub

echo -e "\n${YELLOW}Ingress:${NC}"
kubectl get ingress -n quizhub

echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            Migration Complete Successfully!                   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}Your QuizHub application is now running on Azure AKS!${NC}\n"

echo -e "${YELLOW}Access URLs:${NC}"
echo -e "  Application:  ${BLUE}http://quizhub.local${NC}"
echo -e "  Grafana:      ${BLUE}http://grafana.quizhub.local${NC}"
echo -e "  Kibana:       ${BLUE}http://kibana.quizhub.local${NC}"
echo -e "  Prometheus:   ${BLUE}http://prometheus.quizhub.local${NC}"
echo -e "  Jaeger:       ${BLUE}http://jaeger.quizhub.local${NC}"

echo -e "\n${YELLOW}Useful Commands:${NC}"
echo -e "  Check pods:        ${BLUE}kubectl get pods -n quizhub${NC}"
echo -e "  Check logs:        ${BLUE}kubectl logs -f <pod-name> -n quizhub${NC}"
echo -e "  Scale deployment:  ${BLUE}kubectl scale deployment <name> --replicas=3 -n quizhub${NC}"
echo -e "  Port forward:      ${BLUE}kubectl port-forward svc/<service> <local-port>:<remote-port> -n quizhub${NC}"

echo -e "\n${YELLOW}Cost Management:${NC}"
echo -e "  Monitor costs:     ${BLUE}https://portal.azure.com → Cost Management${NC}"
echo -e "  Scale down:        ${BLUE}az aks scale --resource-group quizhub-rg --name quizhub-aks --node-count 1${NC}"
echo -e "  Stop cluster:      ${BLUE}az aks stop --resource-group quizhub-rg --name quizhub-aks${NC}"
echo -e "  Start cluster:     ${BLUE}az aks start --resource-group quizhub-rg --name quizhub-aks${NC}"

echo -e "\n${RED}Important:${NC} Monitor your Azure credit balance regularly!"
echo -e "Check balance at: ${BLUE}https://www.microsoftazuresponsorships.com/Balance${NC}\n"
