# QuizHub AKS Infrastructure - Azure Student Account

This Terraform configuration deploys a complete Azure Kubernetes Service (AKS) cluster optimized for Azure Student accounts ($100 credit).

## Cost Optimization Strategy

**Estimated Monthly Cost: ~$60-80/month**

- **VM Size**: `Standard_B2s` (2 vCPU, 4GB RAM) - ~$30/month per node
- **Node Count**: 2 nodes initially, auto-scales 2-4 nodes
- **Storage**: Standard managed disks
- **Load Balancer**: Standard (included)
- **Container Registry**: Basic tier - ~$5/month
- **Log Analytics**: Pay-as-you-go with 30-day retention

## Prerequisites

1. **Azure CLI** installed:
   ```bash
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **Terraform** installed:
   ```bash
   wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
   sudo apt update && sudo apt install terraform
   ```

3. **kubectl** installed:
   ```bash
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
   ```

## Setup Instructions

### Step 1: Login to Azure

```bash
# Login with your student account
az login

# Verify your subscription
az account show

# Set subscription (if you have multiple)
az account set --subscription "Azure for Students"
```

### Step 2: Configure Terraform Variables

```bash
cd terraform/azure

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit variables (IMPORTANT: Change acr_name to something unique!)
nano terraform.tfvars
```

**Critical**: `acr_name` must be globally unique across all of Azure. Add your initials or random numbers.

### Step 3: Initialize Terraform

```bash
terraform init
```

### Step 4: Plan Deployment

```bash
# Review what will be created
terraform plan

# Check estimated costs
# Look for resource counts and VM sizes
```

### Step 5: Deploy Infrastructure

```bash
# Deploy (takes 10-15 minutes)
terraform apply

# Type 'yes' when prompted
```

### Step 6: Configure kubectl

```bash
# Get cluster credentials
az aks get-credentials --resource-group quizhub-rg --name quizhub-aks

# Verify connection
kubectl get nodes
kubectl get namespaces
```

### Step 7: Setup Container Registry Authentication

```bash
# Get ACR credentials
export ACR_NAME=$(terraform output -raw acr_name)
export ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server)
export ACR_USERNAME=$(terraform output -raw acr_admin_username)
export ACR_PASSWORD=$(terraform output -raw acr_admin_password)

# Login to ACR
az acr login --name $ACR_NAME

# Or use Docker directly
echo $ACR_PASSWORD | docker login $ACR_LOGIN_SERVER -u $ACR_USERNAME --password-stdin
```

## Deploying QuizHub Application

### Step 1: Build and Push Images

```bash
cd /home/dis/Documents/Faks/QuizHub

# Build and tag images
docker build -t $ACR_LOGIN_SERVER/quizhub-gateway:latest ./Services/Gateway/Gateway.Api
docker build -t $ACR_LOGIN_SERVER/quizhub-user-service:latest ./Services/UserService/UserService.Api
docker build -t $ACR_LOGIN_SERVER/quizhub-quiz-service:latest ./Services/QuizService/QuizService.Api
docker build -t $ACR_LOGIN_SERVER/quizhub-result-service:latest ./Services/ResultService/ResultService.Api
docker build -t $ACR_LOGIN_SERVER/quizhub-frontend:latest ./frontend

# Push images
docker push $ACR_LOGIN_SERVER/quizhub-gateway:latest
docker push $ACR_LOGIN_SERVER/quizhub-user-service:latest
docker push $ACR_LOGIN_SERVER/quizhub-quiz-service:latest
docker push $ACR_LOGIN_SERVER/quizhub-result-service:latest
docker push $ACR_LOGIN_SERVER/quizhub-frontend:latest
```

### Step 2: Update Kubernetes Manifests

Update all deployment manifests to use your ACR:

```bash
# Use the helper script
cd /home/dis/Documents/Faks/QuizHub
./k8s/scripts/update-image-registry.sh $ACR_LOGIN_SERVER
```

Or manually update each deployment's image field:
```yaml
image: <your-acr-name>.azurecr.io/quizhub-gateway:latest
```

### Step 3: Deploy Application Components

```bash
# Create database secrets
kubectl apply -f k8s/databases/user-db-secret.yaml
kubectl apply -f k8s/databases/quiz-db-secret.yaml
kubectl apply -f k8s/databases/result-db-secret.yaml

# Deploy databases
kubectl apply -f k8s/databases/user-db-statefulset.yaml
kubectl apply -f k8s/databases/user-db-service.yaml
kubectl apply -f k8s/databases/quiz-db-statefulset.yaml
kubectl apply -f k8s/databases/quiz-db-service.yaml
kubectl apply -f k8s/databases/result-db-statefulset.yaml
kubectl apply -f k8s/databases/result-db-service.yaml

# Wait for databases
kubectl wait --for=condition=ready pod -l app=user-db -n quizhub --timeout=300s
kubectl wait --for=condition=ready pod -l app=quiz-db -n quizhub --timeout=300s
kubectl wait --for=condition=ready pod -l app=result-db -n quizhub --timeout=300s

# Deploy services
kubectl apply -f k8s/services/user-service/
kubectl apply -f k8s/services/quiz-service/
kubectl apply -f k8s/services/result-service/
kubectl apply -f k8s/services/gateway/
kubectl apply -f k8s/frontend/

# Deploy observability stack
kubectl apply -f k8s/observability/elasticsearch.yaml
kubectl apply -f k8s/observability/kibana.yaml
kubectl apply -f k8s/observability/filebeat.yaml
kubectl apply -f k8s/observability/jaeger.yaml
kubectl apply -f k8s/observability/prometheus.yaml
kubectl apply -f k8s/observability/grafana.yaml

# Deploy ingress
kubectl apply -f k8s/ingress/quizhub-ingress.yaml
kubectl apply -f k8s/ingress/grafana-ingress.yaml
kubectl apply -f k8s/ingress/kibana-ingress.yaml
kubectl apply -f k8s/ingress/prometheus-ingress.yaml
```

### Step 4: Configure DNS

```bash
# Get the ingress IP
export INGRESS_IP=$(terraform output -raw ingress_ip)
echo "Ingress IP: $INGRESS_IP"

# Add to /etc/hosts for local testing
echo "$INGRESS_IP quizhub.local" | sudo tee -a /etc/hosts
echo "$INGRESS_IP grafana.quizhub.local" | sudo tee -a /etc/hosts
echo "$INGRESS_IP kibana.quizhub.local" | sudo tee -a /etc/hosts
echo "$INGRESS_IP jaeger.quizhub.local" | sudo tee -a /etc/hosts
echo "$INGRESS_IP prometheus.quizhub.local" | sudo tee -a /etc/hosts

# Or configure Azure DNS (for production)
# See: https://learn.microsoft.com/en-us/azure/dns/dns-getstarted-portal
```

### Step 5: Verify Deployment

```bash
# Check all pods
kubectl get pods -n quizhub
kubectl get pods -n observability

# Check services
kubectl get svc -n quizhub
kubectl get svc -n observability

# Check ingress
kubectl get ingress -n quizhub
kubectl get ingress -n observability

# Access application
curl http://quizhub.local
# or open in browser: http://quizhub.local
```

## Monitoring and Observability

All observability tools are accessible via ingress:

- **Application**: http://quizhub.local
- **Grafana**: http://grafana.quizhub.local
- **Kibana**: http://kibana.quizhub.local
- **Jaeger**: http://jaeger.quizhub.local (not in ingress by default)
- **Prometheus**: http://prometheus.quizhub.local

Or use port-forwarding:

```bash
# Grafana
kubectl port-forward -n observability svc/grafana 3000:80

# Kibana
kubectl port-forward -n observability svc/kibana 5601:5601

# Jaeger
kubectl port-forward -n observability svc/jaeger-query 16686:16686

# Prometheus
kubectl port-forward -n observability svc/prometheus 9090:9090
```

## Cost Management

### Monitor Your Spending

```bash
# Check your Azure credit balance
az account show --query "name"

# View cost analysis in Azure Portal
# Navigate to: Cost Management + Billing → Cost Analysis
```

### Scale Down When Not Using

```bash
# Scale down to 1 node to save costs
az aks scale --resource-group quizhub-rg --name quizhub-aks --node-count 1

# Scale application deployments to 1 replica
kubectl scale deployment --all --replicas=1 -n quizhub

# Or stop the cluster entirely (preserves data)
az aks stop --resource-group quizhub-rg --name quizhub-aks

# Restart when needed
az aks start --resource-group quizhub-rg --name quizhub-aks
```

### Clean Up When Done

```bash
# Destroy everything
cd terraform/azure
terraform destroy

# Or manually delete resource group
az group delete --name quizhub-rg --yes --no-wait
```

## Troubleshooting

### Pod Stuck in ImagePullBackOff

```bash
# Check if ACR is accessible
kubectl get pods -n quizhub
kubectl describe pod <pod-name> -n quizhub

# Verify ACR role assignment
az role assignment list --scope $(terraform output -raw aks_cluster_id) --role AcrPull

# If needed, manually create role assignment
az aks update -n quizhub-aks -g quizhub-rg --attach-acr quizhubacr
```

### Cluster Not Accessible

```bash
# Re-download credentials
az aks get-credentials --resource-group quizhub-rg --name quizhub-aks --overwrite-existing

# Check cluster status
az aks show --resource-group quizhub-rg --name quizhub-aks --query "powerState"
```

### Out of Resources

```bash
# Check node resources
kubectl top nodes
kubectl describe nodes

# Scale up (carefully monitor costs!)
az aks scale --resource-group quizhub-rg --name quizhub-aks --node-count 3
```

### Database Connection Issues

```bash
# Check database pods
kubectl get pods -n quizhub -l app=user-db
kubectl logs -n quizhub <db-pod-name>

# Check service DNS
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup user-db.quizhub.svc.cluster.local
```

## Maintenance

### Update Kubernetes Version

```bash
# Check available versions
az aks get-upgrades --resource-group quizhub-rg --name quizhub-aks -o table

# Upgrade
az aks upgrade --resource-group quizhub-rg --name quizhub-aks --kubernetes-version 1.29.0
```

### Update Application

```bash
# Build new images with version tag
docker build -t $ACR_LOGIN_SERVER/quizhub-gateway:v1.1 ./Services/Gateway/Gateway.Api
docker push $ACR_LOGIN_SERVER/quizhub-gateway:v1.1

# Update deployment
kubectl set image deployment/gateway gateway=$ACR_LOGIN_SERVER/quizhub-gateway:v1.1 -n quizhub

# Or rollout restart
kubectl rollout restart deployment/gateway -n quizhub
```

## What Gets Created

### Azure Resources

1. **Resource Group**: `quizhub-rg`
2. **AKS Cluster**: `quizhub-aks`
   - 2 nodes (Standard_B2s)
   - Auto-scaling 2-4 nodes
   - Azure CNI networking
   - System-assigned managed identity
3. **Virtual Network**: `quizhub-aks-vnet`
   - Subnet for AKS nodes
4. **Container Registry**: `quizhubacr` (your unique name)
   - Basic tier
   - Admin enabled
5. **Public IP**: Static IP for ingress
6. **Log Analytics Workspace**: For monitoring
7. **Node Resource Group**: Automatically created, contains:
   - VM Scale Set
   - Managed Disks
   - Load Balancer
   - Network Security Groups

### Kubernetes Resources

**Namespaces**:
- `quizhub`: Application components
- `observability`: Monitoring stack
- `ingress-nginx`: Ingress controller

**Helm Charts**:
- NGINX Ingress Controller
- Metrics Server

## Security Considerations

1. **Network Policies**: Azure CNI with network policies enabled
2. **RBAC**: AKS managed identity with minimal permissions
3. **Secrets**: Use Kubernetes secrets (consider Azure Key Vault for production)
4. **Registry**: ACR with role-based access control
5. **TLS**: Configure cert-manager for HTTPS (not included, see below)

### Optional: Add HTTPS with cert-manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml

# Configure Let's Encrypt issuer (requires real domain)
# See k8s/ingress/cert-manager-issuer.yaml (create this file)
```

## Support Resources

- [AKS Documentation](https://learn.microsoft.com/en-us/azure/aks/)
- [Azure Student FAQ](https://azure.microsoft.com/en-us/free/students/)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

## Cost Breakdown (Estimated)

| Resource | Size/SKU | Monthly Cost |
|----------|----------|--------------|
| AKS Control Plane | Free | $0 |
| VM Nodes (2x) | Standard_B2s | ~$60 |
| Standard Load Balancer | Pay-per-use | ~$5 |
| Public IP | Static | ~$4 |
| Container Registry | Basic | ~$5 |
| Managed Disks | Standard | ~$5 |
| Log Analytics | Pay-per-use | ~$5 |
| **Total** | | **~$84/month** |

**Note**: Actual costs may vary. Monitor usage regularly!

## Next Steps After Deployment

1. ✅ Configure custom domain (optional)
2. ✅ Set up cert-manager for HTTPS (optional)
3. ✅ Configure Azure DevOps or GitHub Actions for CI/CD
4. ✅ Set up backup strategies for databases
5. ✅ Configure alerting in Azure Monitor
6. ✅ Implement Azure Key Vault for secrets
7. ✅ Review and optimize resource requests/limits
8. ✅ Set up budget alerts in Azure Cost Management
