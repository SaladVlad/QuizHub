# QuizHub Kubernetes Deployment Guide

Complete guide for deploying QuizHub microservices platform on Kubernetes with observability stack (ELK + Prometheus).

## 📋 Prerequisites

- **Minikube** v1.30+ installed
- **kubectl** v1.28+ installed
- **Docker** v20.10+ installed
- **Helm** v3.0+ installed (for observability stack)
- **System Requirements:**
  - CPU: 6+ cores
  - RAM: 16GB minimum (20GB recommended)
  - Disk: 60GB free space

## 🚀 Quick Start (Automated)

### 1. Start Fresh Cluster and Deploy Everything

```bash
# From the QuizHub root directory
cd k8s/scripts

# Make scripts executable
chmod +x *.sh

# Run complete setup (creates cluster + deploys everything)
./setup-all.sh
```

This will:
1. ✅ Start Minikube cluster with proper resources
2. ✅ Enable required addons (ingress, metrics-server)
3. ✅ Create namespaces
4. ✅ Build Docker images
5. ✅ Deploy databases
6. ✅ Deploy microservices
7. ✅ Configure ingress

**Total setup time:** ~5-7 minutes

### 2. Access the Application

After deployment completes:

```bash
# Add to /etc/hosts (Linux/Mac)
echo "$(minikube ip) quizhub.local" | sudo tee -a /etc/hosts

# Access the application
open http://quizhub.local          # Frontend
open http://quizhub.local/api      # API Gateway
```

**Windows users:**
```powershell
# Add to C:\Windows\System32\drivers\etc\hosts (as Administrator)
# Get Minikube IP first
minikube ip
# Then add: <minikube-ip> quizhub.local
```

---

## 📦 Step-by-Step Manual Deployment

### Step 1: Start Minikube Cluster

```bash
# Start cluster with appropriate resources
minikube start \
  --cpus=6 \
  --memory=12288 \
  --disk-size=50g \
  --driver=docker

# Enable required addons
minikube addons enable ingress
minikube addons enable metrics-server

# Verify cluster is running
kubectl get nodes
```

### Step 2: Create Namespaces

```bash
kubectl create namespace quizhub
kubectl create namespace observability
kubectl create namespace databases
```

### Step 3: Build Docker Images

```bash
# Point Docker to Minikube's daemon
eval $(minikube docker-env)

# Build all images
cd k8s/scripts
./build-images.sh
```

**Images built:**
- `quizhub/gateway:latest`
- `quizhub/user-service:latest`
- `quizhub/quiz-service:latest`
- `quizhub/result-service:latest`
- `quizhub/frontend:latest`

### Step 4: Deploy Databases

```bash
# Deploy SQL Server databases
kubectl apply -f ../databases/

# Wait for databases to be ready (takes ~60 seconds)
kubectl wait --for=condition=ready pod -l app=user-db -n databases --timeout=120s
kubectl wait --for=condition=ready pod -l app=quiz-db -n databases --timeout=120s
kubectl wait --for=condition=ready pod -l app=result-db -n databases --timeout=120s

# Verify databases are running
kubectl get pods -n databases
```

### Step 5: Deploy Microservices

```bash
# Deploy all microservices
kubectl apply -f ../services/gateway/
kubectl apply -f ../services/user-service/
kubectl apply -f ../services/quiz-service/
kubectl apply -f ../services/result-service/
kubectl apply -f ../frontend/

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod --all -n quizhub --timeout=180s

# Verify all services are running
kubectl get pods -n quizhub
```

### Step 6: Configure Ingress

```bash
# Deploy ingress rules
kubectl apply -f ../ingress/

# Add to /etc/hosts
echo "$(minikube ip) quizhub.local" | sudo tee -a /etc/hosts
```

---

## 🔍 Observability Stack (Optional)

Deploy ELK Stack + Prometheus + Grafana for full observability:

```bash
# Deploy observability stack
./deploy-observability.sh

# Access dashboards
kubectl port-forward -n observability svc/kibana 5601:5601 &
kubectl port-forward -n observability svc/grafana 3000:3000 &
kubectl port-forward -n observability svc/prometheus 9090:9090 &

# Open in browser
open http://localhost:5601   # Kibana
open http://localhost:3000   # Grafana (admin/admin)
open http://localhost:9090   # Prometheus
```

---

## 🛠️ Useful Commands

### Monitoring

```bash
# View all pods across all namespaces
kubectl get pods --all-namespaces

# Watch pod status in real-time
kubectl get pods -n quizhub --watch

# Check resource usage
kubectl top nodes
kubectl top pods -n quizhub

# View logs
kubectl logs -f deployment/gateway -n quizhub
kubectl logs -f deployment/user-service -n quizhub

# Describe pod (for troubleshooting)
kubectl describe pod <pod-name> -n quizhub
```

### Access Services

```bash
# Port forward to a service
kubectl port-forward svc/gateway 8080:80 -n quizhub

# Execute command in pod
kubectl exec -it <pod-name> -n quizhub -- /bin/bash

# Access database
kubectl exec -it user-db-0 -n databases -- /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Passw0rd'
```

### Scaling

```bash
# Scale a deployment
kubectl scale deployment gateway --replicas=3 -n quizhub

# Check HPA (Horizontal Pod Autoscaler) status
kubectl get hpa -n quizhub

# View deployment status
kubectl rollout status deployment/gateway -n quizhub
```

### Debugging

```bash
# Get events (useful for troubleshooting)
kubectl get events -n quizhub --sort-by='.lastTimestamp'

# Check service endpoints
kubectl get endpoints -n quizhub

# View ingress configuration
kubectl get ingress -n quizhub
kubectl describe ingress quizhub-ingress -n quizhub
```

---

## 🧹 Cleanup

### Delete Everything (Keep Cluster)

```bash
# Delete all QuizHub resources
kubectl delete namespace quizhub
kubectl delete namespace databases
kubectl delete namespace observability
```

### Delete Entire Cluster

```bash
# Stop Minikube
minikube stop

# Delete cluster completely
minikube delete

# Remove from /etc/hosts
sudo sed -i '/quizhub.local/d' /etc/hosts
```

---

## 📊 Architecture

### Namespaces

| Namespace | Purpose | Resources |
|-----------|---------|-----------|
| `quizhub` | Application services | Gateway, UserService, QuizService, ResultService, Frontend |
| `databases` | Stateful data stores | user-db, quiz-db, result-db (SQL Server) |
| `observability` | Monitoring & logging | Elasticsearch, Kibana, Filebeat, Prometheus, Grafana |

### Network Architecture

```
Internet
    ↓
[Ingress Controller] ← quizhub.local
    ↓
┌─────────────────────────────────────┐
│         Namespace: quizhub          │
│                                     │
│  [Frontend] ← React SPA             │
│       ↓                             │
│  [Gateway] ← API Gateway            │
│    ↓  ↓  ↓                          │
│    │  │  └─→ [ResultService]        │
│    │  └────→ [QuizService]          │
│    └───────→ [UserService]          │
└─────────────────────────────────────┘
         ↓         ↓         ↓
┌─────────────────────────────────────┐
│       Namespace: databases          │
│                                     │
│  [user-db]  [quiz-db]  [result-db]  │
│  (SQL Server StatefulSets)          │
└─────────────────────────────────────┘
```

### Resource Allocation

| Component | Pods | CPU Request | Memory Request | Storage |
|-----------|------|-------------|----------------|---------|
| Gateway | 2 | 200m | 256Mi | - |
| UserService | 2 | 250m | 512Mi | - |
| QuizService | 2 | 250m | 512Mi | - |
| ResultService | 2 | 250m | 512Mi | - |
| Frontend | 2 | 100m | 128Mi | - |
| user-db | 1 | 500m | 1Gi | 5Gi |
| quiz-db | 1 | 500m | 1Gi | 5Gi |
| result-db | 1 | 500m | 1Gi | 5Gi |
| **Total** | **13** | **~3 CPUs** | **~6GB RAM** | **15GB** |

---

## 🔧 Troubleshooting

### Pods stuck in "ImagePullBackOff"

```bash
# Make sure images are built in Minikube's Docker
eval $(minikube docker-env)
docker images | grep quizhub

# If images are missing, rebuild
cd k8s/scripts
./build-images.sh
```

### Pods stuck in "Pending"

```bash
# Check if resources are available
kubectl describe pod <pod-name> -n quizhub

# Check node resources
kubectl top nodes

# Might need to increase Minikube resources
minikube stop
minikube config set memory 14336
minikube config set cpus 8
minikube start
```

### Database connection failures

```bash
# Check if databases are running
kubectl get pods -n databases

# Check database logs
kubectl logs user-db-0 -n databases

# Test database connectivity from a pod
kubectl run -it --rm debug --image=mcr.microsoft.com/mssql-tools --restart=Never -- bash
# Inside pod:
/opt/mssql-tools/bin/sqlcmd -S user-db.databases.svc.cluster.local -U sa -P 'YourStrong@Passw0rd'
```

### Ingress not working

```bash
# Check if ingress controller is running
kubectl get pods -n ingress-nginx

# Check ingress configuration
kubectl get ingress -n quizhub
kubectl describe ingress quizhub-ingress -n quizhub

# Verify /etc/hosts entry
cat /etc/hosts | grep quizhub

# Try minikube tunnel (alternative to /etc/hosts)
minikube tunnel  # Run in separate terminal
```

### Logs not showing in Kibana

```bash
# Check if Filebeat is running
kubectl get pods -n observability -l app=filebeat

# Check Elasticsearch
kubectl get pods -n observability -l app=elasticsearch

# Test Elasticsearch connectivity
kubectl port-forward svc/elasticsearch 9200:9200 -n observability
curl http://localhost:9200/_cat/indices
```

---

## 📚 Additional Resources

- [Minikube Documentation](https://minikube.sigs.k8s.io/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/home/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Helm Documentation](https://helm.sh/docs/)

---

## 📝 Notes

- **Security:** Default passwords are used for development. Change them in production!
- **Resources:** Adjust resource requests/limits in manifests based on your needs
- **Images:** Images are built locally in Minikube. For production, push to a registry
- **Persistence:** Database data persists across pod restarts but will be lost if cluster is deleted
- **Networking:** Services communicate via DNS: `<service-name>.<namespace>.svc.cluster.local`

---

**Version:** 1.0
**Last Updated:** 2025-10-08
**Maintainer:** Vladislav Petković
