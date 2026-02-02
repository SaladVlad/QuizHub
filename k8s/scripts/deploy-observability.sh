#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== QuizHub Observability Setup ===${NC}"

# Function to check if a pod is ready
wait_for_pod() {
    local namespace=$1
    local label=$2
    local timeout=300
    local elapsed=0
    
    echo -e "${YELLOW}Waiting for pods with label ${label} in namespace ${namespace}...${NC}"
    
    while [ $elapsed -lt $timeout ]; do
        if kubectl get pods -n $namespace -l $label 2>/dev/null | grep -q "Running"; then
            echo -e "${GREEN}✓ Pods are running${NC}"
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
        echo -n "."
    done
    
    echo -e "${RED}✗ Timeout waiting for pods${NC}"
    return 1
}

# Function to check if a service is responding
wait_for_service() {
    local service_url=$1
    local service_name=$2
    local timeout=300
    local elapsed=0
    
    echo -e "${YELLOW}Waiting for ${service_name} to respond...${NC}"
    
    while [ $elapsed -lt $timeout ]; do
        if kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- \
           curl -s -o /dev/null -w "%{http_code}" $service_url 2>/dev/null | grep -q "200"; then
            echo -e "${GREEN}✓ ${service_name} is responding${NC}"
            kubectl delete pod curl-test --ignore-not-found=true 2>/dev/null
            return 0
        fi
        sleep 10
        elapsed=$((elapsed + 10))
        echo -n "."
    done
    
    echo -e "${RED}✗ Timeout waiting for ${service_name}${NC}"
    kubectl delete pod curl-test --ignore-not-found=true 2>/dev/null
    return 1
}

# Step 1: Apply Elasticsearch
echo -e "\n${GREEN}Step 1: Deploying Elasticsearch...${NC}"
kubectl apply -f /home/dis/Documents/Faks/QuizHub/k8s/observability/elasticsearch.yaml
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Elasticsearch manifest applied${NC}"
    wait_for_pod "observability" "app=elasticsearch"
else
    echo -e "${RED}✗ Failed to apply Elasticsearch manifest${NC}"
    exit 1
fi

# Wait for Elasticsearch to be fully ready
echo -e "${YELLOW}Waiting for Elasticsearch to be fully operational...${NC}"
sleep 30

# Step 2: Apply Kibana
echo -e "\n${GREEN}Step 2: Deploying Kibana...${NC}"
kubectl apply -f /home/dis/Documents/Faks/QuizHub/k8s/observability/kibana.yaml
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Kibana manifest applied${NC}"
    wait_for_pod "observability" "app=kibana"
else
    echo -e "${RED}✗ Failed to apply Kibana manifest${NC}"
    exit 1
fi

# Wait for Kibana to be fully ready
echo -e "${YELLOW}Waiting for Kibana to be fully operational...${NC}"
sleep 45

# Step 3: Apply Filebeat
echo -e "\n${GREEN}Step 3: Deploying Filebeat...${NC}"
kubectl apply -f /home/dis/Documents/Faks/QuizHub/k8s/observability/filebeat.yaml
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Filebeat manifest applied${NC}"
    wait_for_pod "observability" "app=filebeat"
else
    echo -e "${RED}✗ Failed to apply Filebeat manifest${NC}"
    exit 1
fi

# Step 4: Apply Prometheus
echo -e "\n${GREEN}Step 4: Deploying Prometheus...${NC}"
kubectl apply -f /home/dis/Documents/Faks/QuizHub/k8s/observability/prometheus.yaml
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Prometheus manifest applied${NC}"
    wait_for_pod "observability" "app=prometheus"
else
    echo -e "${RED}✗ Failed to apply Prometheus manifest${NC}"
    exit 1
fi

# Step 5: Apply Grafana with dashboards
echo -e "\n${GREEN}Step 5: Deploying Grafana with dashboards...${NC}"
kubectl apply -f /home/dis/Documents/Faks/QuizHub/k8s/observability/grafana-dashboards.yaml
kubectl apply -f /home/dis/Documents/Faks/QuizHub/k8s/observability/grafana.yaml
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Grafana manifest applied${NC}"
    wait_for_pod "observability" "app=grafana"
else
    echo -e "${RED}✗ Failed to apply Grafana manifest${NC}"
    exit 1
fi

# Wait for Grafana to be fully ready
echo -e "${YELLOW}Waiting for Grafana to be fully operational...${NC}"
sleep 30

# Step 6: Setup Kibana Data View
echo -e "\n${GREEN}Step 6: Setting up Kibana Data View...${NC}"
kubectl delete job kibana-setup -n observability 2>/dev/null || true
sleep 2
kubectl apply -f /home/dis/Documents/Faks/QuizHub/k8s/observability/kibana-init-job.yaml
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Kibana init job started${NC}"
    sleep 10
    kubectl logs -n observability job/kibana-setup -f 2>/dev/null || true
else
    echo -e "${RED}✗ Failed to start Kibana init job${NC}"
fi

# Step 7: Verify Grafana Setup
echo -e "\n${GREEN}Step 7: Verifying Grafana Setup...${NC}"
kubectl delete job grafana-setup -n observability 2>/dev/null || true
sleep 2
kubectl apply -f /home/dis/Documents/Faks/QuizHub/k8s/observability/grafana-init-job.yaml
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Grafana verification job started${NC}"
    sleep 10
    kubectl logs -n observability job/grafana-setup -f 2>/dev/null || true
else
    echo -e "${RED}✗ Failed to start Grafana verification job${NC}"
fi

# Step 8: Apply Jaeger with OTLP support
echo -e "\n${GREEN}Step 8: Deploying Jaeger with OTLP support...${NC}"
kubectl delete deployment jaeger -n observability 2>/dev/null || true
sleep 5
kubectl apply -f /home/dis/Documents/Faks/QuizHub/k8s/observability/jaeger.yaml
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Jaeger manifest applied${NC}"
    wait_for_pod "observability" "app=jaeger"
else
    echo -e "${RED}✗ Failed to apply Jaeger manifest${NC}"
    exit 1
fi

# Step 9: Restart application pods to reconnect to Jaeger
echo -e "\n${GREEN}Step 9: Restarting application services to connect to Jaeger...${NC}"
kubectl rollout restart deployment -n quizhub
echo -e "${GREEN}✓ Application services restarting${NC}"

# Wait for services to be ready
sleep 30

echo -e "\n${GREEN}=== Deployment Summary ===${NC}"
echo -e "${YELLOW}Checking pod status...${NC}"
kubectl get pods -n observability
kubectl get pods -n quizhub

echo -e "\n${GREEN}=== Service Endpoints ===${NC}"
echo -e "${YELLOW}Elasticsearch:${NC} http://elasticsearch.observability.svc.cluster.local:9200"
echo -e "${YELLOW}Kibana:${NC} http://kibana.observability.svc.cluster.local:5601"
echo -e "${YELLOW}Prometheus:${NC} http://prometheus.observability.svc.cluster.local:9090"
echo -e "${YELLOW}Grafana:${NC} http://grafana.observability.svc.cluster.local:3000 (admin/admin)"
echo -e "${YELLOW}Jaeger UI:${NC} http://jaeger-query.observability.svc.cluster.local:16686"
echo -e "${YELLOW}Jaeger OTLP gRPC:${NC} http://jaeger-collector.observability.svc.cluster.local:4317"
echo -e "${YELLOW}Jaeger OTLP HTTP:${NC} http://jaeger-collector.observability.svc.cluster.local:4318"

echo -e "\n${GREEN}=== Verification Steps ===${NC}"
echo -e "1. Check Elasticsearch indices:"
echo -e "   ${YELLOW}kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- curl -s http://elasticsearch.observability.svc.cluster.local:9200/_cat/indices?v${NC}"
echo -e ""
echo -e "2. Access Kibana (if ingress is configured):"
echo -e "   ${YELLOW}http://kibana.quizhub.local${NC}"
echo -e "   Or port-forward: ${YELLOW}kubectl port-forward -n observability svc/kibana 5601:5601${NC}"
echo -e ""
echo -e "3. Access Grafana (if ingress is configured):"
echo -e "   ${YELLOW}http://grafana.quizhub.local${NC}"
echo -e "   Or port-forward: ${YELLOW}kubectl port-forward -n observability svc/grafana 3000:3000${NC}"
echo -e "   Credentials: admin/admin"
echo -e ""
echo -e "4. Access Jaeger UI (if ingress is configured):"
echo -e "   ${YELLOW}http://jaeger.quizhub.local${NC}"
echo -e "   Or port-forward: ${YELLOW}kubectl port-forward -n observability svc/jaeger-query 16686:16686${NC}"
echo -e ""
echo -e "5. Check Filebeat logs:"
echo -e "   ${YELLOW}kubectl logs -n observability -l app=filebeat --tail=50${NC}"
echo -e ""
echo -e "6. Check Jaeger logs:"
echo -e "   ${YELLOW}kubectl logs -n observability -l app=jaeger --tail=50${NC}"

echo -e "\n${GREEN}=== Checking Elasticsearch Indices ===${NC}"
kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- \
  curl -s 'http://elasticsearch.observability.svc.cluster.local:9200/_cat/indices?v' 2>/dev/null || \
  echo -e "${YELLOW}Could not retrieve indices${NC}"

echo -e "\n${GREEN}=== Setup Complete! ===${NC}"
