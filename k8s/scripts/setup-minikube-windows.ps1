# QuizHub Minikube Setup Script for Windows
# This script sets up the complete QuizHub platform with observability stack on Minikube

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   QuizHub Kubernetes Complete Setup Script     " -ForegroundColor Cyan
Write-Host "   (Windows / Minikube Edition)                 " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$K8sDir = Split-Path -Parent $ScriptDir
$ProjectRoot = Split-Path -Parent $K8sDir

Write-Host "Project Root: $ProjectRoot" -ForegroundColor Gray
Write-Host "K8s Directory: $K8sDir" -ForegroundColor Gray
Write-Host ""

# Step 1: Check prerequisites
Write-Host "[1/10] Checking prerequisites..." -ForegroundColor Yellow

$tools = @("minikube", "kubectl", "docker")
foreach ($tool in $tools) {
    try {
        $null = Get-Command $tool -ErrorAction Stop
        Write-Host "  [OK] $tool found" -ForegroundColor Green
    } catch {
        Write-Host "  [ERROR] $tool not found. Please install it first." -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Step 2: Check if Minikube is running
Write-Host "[2/10] Checking Minikube status..." -ForegroundColor Yellow

$minikubeStatus = minikube status --format='{{.Host}}' 2>$null
if ($minikubeStatus -ne "Running") {
    Write-Host "  Starting Minikube cluster (this takes 3-5 minutes)..." -ForegroundColor Cyan
    minikube start --cpus=4 --memory=8192 --disk-size=30g --driver=docker
    Write-Host "  [OK] Minikube cluster started" -ForegroundColor Green
} else {
    Write-Host "  [OK] Minikube is already running" -ForegroundColor Green
}
Write-Host ""

# Step 3: Enable addons
Write-Host "[3/10] Enabling Minikube addons..." -ForegroundColor Yellow
minikube addons enable ingress 2>$null
minikube addons enable metrics-server 2>$null
Write-Host "  [OK] Addons enabled (ingress, metrics-server)" -ForegroundColor Green
Write-Host ""

# Step 4: Create namespaces
Write-Host "[4/10] Creating namespaces..." -ForegroundColor Yellow
kubectl create namespace quizhub 2>$null
kubectl create namespace observability 2>$null
kubectl create namespace databases 2>$null
Write-Host "  [OK] Namespaces ready (quizhub, observability, databases)" -ForegroundColor Green
Write-Host ""

# Step 5: Configure Docker to use Minikube's daemon
Write-Host "[5/10] Configuring Docker for Minikube..." -ForegroundColor Yellow
& minikube -p minikube docker-env --shell powershell | Invoke-Expression
Write-Host "  [OK] Docker configured to use Minikube daemon" -ForegroundColor Green
Write-Host ""

# Step 6: Build Docker images
Write-Host "[6/10] Building Docker images (this takes 5-10 minutes)..." -ForegroundColor Yellow

$services = @(
    @{Name="Gateway"; Path="Services/Gateway/Gateway.Api"; Image="quizhub/gateway:latest"},
    @{Name="UserService"; Path="Services/UserService/UserService.Api"; Image="quizhub/user-service:latest"},
    @{Name="QuizService"; Path="Services/QuizService/QuizService.Api"; Image="quizhub/quiz-service:latest"},
    @{Name="ResultService"; Path="Services/ResultService/ResultService.Api"; Image="quizhub/result-service:latest"}
)

foreach ($svc in $services) {
    $svcPath = Join-Path $ProjectRoot $svc.Path
    if (Test-Path $svcPath) {
        Write-Host "  Building $($svc.Name)..." -ForegroundColor Cyan
        Push-Location $svcPath
        docker build -t $svc.Image . 2>&1 | Out-Null
        Pop-Location
        Write-Host "  [OK] $($svc.Name) built" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] $($svc.Name) - path not found: $svcPath" -ForegroundColor Yellow
    }
}

# Build Frontend if exists
$frontendPath = Join-Path $ProjectRoot "frontend"
if (Test-Path (Join-Path $frontendPath "Dockerfile")) {
    Write-Host "  Building Frontend..." -ForegroundColor Cyan
    Push-Location $frontendPath
    docker build -t quizhub/frontend:latest . 2>&1 | Out-Null
    Pop-Location
    Write-Host "  [OK] Frontend built" -ForegroundColor Green
}
Write-Host ""

# Step 7: Deploy databases
Write-Host "[7/10] Deploying SQL Server databases..." -ForegroundColor Yellow
kubectl apply -f "$K8sDir/databases/" 2>&1 | Out-Null
Write-Host "  Waiting for databases to be ready (max 3 minutes)..."
Start-Sleep -Seconds 30
kubectl wait --for=condition=ready pod -l app=user-db -n databases --timeout=180s 2>$null
kubectl wait --for=condition=ready pod -l app=quiz-db -n databases --timeout=180s 2>$null
kubectl wait --for=condition=ready pod -l app=result-db -n databases --timeout=180s 2>$null
Write-Host "  [OK] Databases deployed" -ForegroundColor Green
Write-Host ""

# Step 8: Deploy microservices
Write-Host "[8/10] Deploying QuizHub microservices..." -ForegroundColor Yellow
$serviceDirs = @("gateway", "user-service", "quiz-service", "result-service")
foreach ($dir in $serviceDirs) {
    $svcPath = "$K8sDir/services/$dir"
    if (Test-Path $svcPath) {
        kubectl apply -f $svcPath/ 2>&1 | Out-Null
        Write-Host "  [OK] $dir deployed" -ForegroundColor Green
    }
}

# Deploy frontend
if (Test-Path "$K8sDir/frontend") {
    kubectl apply -f "$K8sDir/frontend/" 2>&1 | Out-Null
    Write-Host "  [OK] Frontend deployed" -ForegroundColor Green
}

Write-Host "  Waiting for services to be ready..."
Start-Sleep -Seconds 20
kubectl wait --for=condition=ready pod --all -n quizhub --timeout=180s 2>$null
Write-Host ""

# Step 9: Deploy Observability Stack
Write-Host "[9/10] Deploying Observability Stack..." -ForegroundColor Yellow

# Elasticsearch
Write-Host "  Deploying Elasticsearch..." -ForegroundColor Cyan
kubectl apply -f "$K8sDir/observability/elasticsearch.yaml" 2>&1 | Out-Null
Start-Sleep -Seconds 10

# Kibana
Write-Host "  Deploying Kibana..." -ForegroundColor Cyan
kubectl apply -f "$K8sDir/observability/kibana.yaml" 2>&1 | Out-Null

# Filebeat
Write-Host "  Deploying Filebeat..." -ForegroundColor Cyan
kubectl apply -f "$K8sDir/observability/filebeat.yaml" 2>&1 | Out-Null

# Prometheus
Write-Host "  Deploying Prometheus..." -ForegroundColor Cyan
kubectl apply -f "$K8sDir/observability/prometheus.yaml" 2>&1 | Out-Null

# Grafana
Write-Host "  Deploying Grafana with dashboards..." -ForegroundColor Cyan
kubectl apply -f "$K8sDir/observability/grafana-dashboards.yaml" 2>&1 | Out-Null
kubectl apply -f "$K8sDir/observability/grafana.yaml" 2>&1 | Out-Null

# Jaeger
Write-Host "  Deploying Jaeger..." -ForegroundColor Cyan
kubectl apply -f "$K8sDir/observability/jaeger.yaml" 2>&1 | Out-Null

Write-Host "  Waiting for observability stack to be ready..."
Start-Sleep -Seconds 60
kubectl wait --for=condition=ready pod -l app=elasticsearch -n observability --timeout=300s 2>$null
kubectl wait --for=condition=ready pod -l app=kibana -n observability --timeout=180s 2>$null
kubectl wait --for=condition=ready pod -l app=prometheus -n observability --timeout=180s 2>$null
kubectl wait --for=condition=ready pod -l app=grafana -n observability --timeout=180s 2>$null
kubectl wait --for=condition=ready pod -l app=jaeger -n observability --timeout=180s 2>$null

Write-Host "  [OK] Observability stack deployed" -ForegroundColor Green
Write-Host ""

# Step 10: Setup init jobs
Write-Host "[10/10] Running initialization jobs..." -ForegroundColor Yellow
kubectl delete job kibana-setup -n observability 2>$null
kubectl apply -f "$K8sDir/observability/kibana-init-job.yaml" 2>&1 | Out-Null
kubectl delete job grafana-setup -n observability 2>$null
kubectl apply -f "$K8sDir/observability/grafana-init-job.yaml" 2>&1 | Out-Null
Write-Host "  [OK] Init jobs started" -ForegroundColor Green
Write-Host ""

# Configure ingress
Write-Host "Configuring Ingress..." -ForegroundColor Yellow
kubectl apply -f "$K8sDir/ingress/" 2>&1 | Out-Null
Write-Host "  [OK] Ingress configured" -ForegroundColor Green
Write-Host ""

# Final summary
Write-Host "================================================" -ForegroundColor Green
Write-Host "          Setup Complete!                       " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Cluster Status:" -ForegroundColor Cyan
kubectl get pods --all-namespaces

$minikubeIP = minikube ip
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Access Instructions:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Minikube IP: $minikubeIP" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Add to C:\Windows\System32\drivers\etc\hosts:" -ForegroundColor White
Write-Host "  $minikubeIP quizhub.local kibana.quizhub.local grafana.quizhub.local jaeger.quizhub.local prometheus.quizhub.local" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Use port-forwarding (recommended):" -ForegroundColor White
Write-Host "  kubectl port-forward -n quizhub svc/gateway 8080:80" -ForegroundColor Gray
Write-Host "  kubectl port-forward -n observability svc/kibana 5601:5601" -ForegroundColor Gray
Write-Host "  kubectl port-forward -n observability svc/grafana 3000:3000" -ForegroundColor Gray
Write-Host "  kubectl port-forward -n observability svc/jaeger-query 16686:16686" -ForegroundColor Gray
Write-Host "  kubectl port-forward -n observability svc/prometheus 9090:9090" -ForegroundColor Gray
Write-Host ""
Write-Host "Access URLs (after port-forwarding):" -ForegroundColor Cyan
Write-Host "  QuizHub API:  http://localhost:8080" -ForegroundColor White
Write-Host "  Kibana:       http://localhost:5601" -ForegroundColor White
Write-Host "  Grafana:      http://localhost:3000  (admin/admin)" -ForegroundColor White
Write-Host "  Jaeger:       http://localhost:16686" -ForegroundColor White
Write-Host "  Prometheus:   http://localhost:9090" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  View all pods:     kubectl get pods -A" -ForegroundColor Gray
Write-Host "  View logs:         kubectl logs -f deployment/gateway -n quizhub" -ForegroundColor Gray
Write-Host "  Check status:      ./status.sh" -ForegroundColor Gray
Write-Host "  Cleanup:           ./cleanup.sh" -ForegroundColor Gray
Write-Host ""
