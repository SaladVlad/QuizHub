# QuizHub Azure AKS Migration - Quick Start

## 🚀 One-Command Migration

```bash
cd /home/dis/Documents/Faks/QuizHub/terraform/azure
./migrate-to-aks.sh
```

This automated script will:
1. ✅ Check prerequisites (Azure CLI, Terraform, kubectl, Docker)
2. ✅ Verify Azure login
3. ✅ Deploy AKS infrastructure (10-15 minutes)
4. ✅ Build and push Docker images to ACR
5. ✅ Update Kubernetes manifests
6. ✅ Deploy application and observability stack
7. ✅ Configure local DNS
8. ✅ Verify deployment

## 📋 Prerequisites

Install required tools (Ubuntu/Debian):

```bash
# Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Docker (if not installed)
sudo apt install docker.io
sudo usermod -aG docker $USER
```

## ⚙️ Before You Start

1. **Login to Azure**:
   ```bash
   az login
   ```

2. **Edit Configuration** (IMPORTANT!):
   ```bash
   cd terraform/azure
   cp terraform.tfvars.example terraform.tfvars
   nano terraform.tfvars
   ```
   
   **Change `acr_name` to something unique!** (e.g., `quizhubacr123` → `quizhubacr<your-initials><random-numbers>`)

3. **Run Migration**:
   ```bash
   ./migrate-to-aks.sh
   ```

## 💰 Cost Estimate

**~$80-85/month** with this configuration:
- 2x Standard_B2s VMs: ~$60/month
- Container Registry (Basic): ~$5/month
- Load Balancer: ~$5/month
- Storage & Networking: ~$10-15/month

**Your $100 student credit will last ~1 month** with continuous usage.

### Cost Saving Tips:

**Scale down when not using:**
```bash
# Stop cluster (saves ~90% of costs)
az aks stop --resource-group quizhub-rg --name quizhub-aks

# Start when needed
az aks start --resource-group quizhub-rg --name quizhub-aks
```

**Reduce to 1 node:**
```bash
az aks scale --resource-group quizhub-rg --name quizhub-aks --node-count 1
```

**Delete when done:**
```bash
cd terraform/azure
terraform destroy
```

## 🔍 Manual Step-by-Step (Alternative)

If you prefer manual control:

### 1. Deploy Infrastructure
```bash
cd terraform/azure
terraform init
terraform plan
terraform apply
```

### 2. Configure kubectl
```bash
az aks get-credentials --resource-group quizhub-rg --name quizhub-aks
kubectl get nodes
```

### 3. Build and Push Images
```bash
# Get ACR details
ACR_NAME=$(terraform output -raw acr_name)
ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server)

# Login to ACR
az acr login --name $ACR_NAME

# Build and push
cd /home/dis/Documents/Faks/QuizHub
./k8s/scripts/build-and-push-acr.sh $ACR_LOGIN_SERVER
```

### 4. Update Manifests
```bash
./k8s/scripts/update-image-registry.sh $ACR_LOGIN_SERVER
```

### 5. Deploy Application
```bash
cd k8s

# Databases
kubectl apply -f databases/

# Services
kubectl apply -f services/

# Frontend
kubectl apply -f frontend/

# Observability
kubectl apply -f observability/

# Ingress
kubectl apply -f ingress/
```

### 6. Configure DNS
```bash
INGRESS_IP=$(cd terraform/azure && terraform output -raw ingress_ip)
echo "$INGRESS_IP quizhub.local" | sudo tee -a /etc/hosts
```

## ✅ Verification

```bash
# Check pods
kubectl get pods -n quizhub
kubectl get pods -n observability

# Check services
kubectl get svc -n quizhub

# Check ingress
kubectl get ingress -n quizhub

# Access application
curl http://quizhub.local
```

## 🌐 Access URLs

- **Application**: http://quizhub.local
- **Grafana**: http://grafana.quizhub.local
- **Kibana**: http://kibana.quizhub.local
- **Prometheus**: http://prometheus.quizhub.local

## 🔧 Troubleshooting

### ImagePullBackOff Error
```bash
# Verify ACR access
az aks update -n quizhub-aks -g quizhub-rg --attach-acr $(cd terraform/azure && terraform output -raw acr_name)
```

### Can't Access Application
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress IP
kubectl get svc -n ingress-nginx
```

### Pods Not Starting
```bash
# Check pod logs
kubectl describe pod <pod-name> -n quizhub
kubectl logs <pod-name> -n quizhub
```

## 📊 Monitoring

### Check Resource Usage
```bash
kubectl top nodes
kubectl top pods -n quizhub
```

### Check Azure Costs
```bash
# View in portal
https://portal.azure.com → Cost Management + Billing

# Check balance
https://www.microsoftazuresponsorships.com/Balance
```

## 🗑️ Cleanup

### Delete Everything
```bash
cd terraform/azure
terraform destroy
```

### Or Delete Resource Group
```bash
az group delete --name quizhub-rg --yes --no-wait
```

## 📚 Next Steps

1. ✅ Set up CI/CD with GitHub Actions
2. ✅ Configure custom domain
3. ✅ Add HTTPS with cert-manager
4. ✅ Set up budget alerts
5. ✅ Configure backup strategies

## 🆘 Support

- **Azure Student Portal**: https://azure.microsoft.com/free/students
- **AKS Documentation**: https://learn.microsoft.com/azure/aks/
- **Terraform Azure Docs**: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs

## 🎓 Student Account Tips

1. **Monitor usage daily** - Set up alerts at 50%, 75%, and 90% of credit
2. **Stop resources when not using** - Cluster stop saves ~90% of costs
3. **Use Basic/Standard SKUs** - Premium features cost more
4. **Clean up test resources** - Don't leave unused resources running
5. **Set expiration reminders** - Student credit expires after 12 months

---

**Ready to migrate?** Run `./migrate-to-aks.sh` and your QuizHub will be on Azure in 15-20 minutes! 🚀
