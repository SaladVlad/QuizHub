#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== QuizHub Observability Diagnostics ===${NC}\n"

# Check Elasticsearch
echo -e "${BLUE}=== Elasticsearch Status ===${NC}"
kubectl get pods -n observability -l app=elasticsearch
echo ""
echo -e "${YELLOW}Elasticsearch Health:${NC}"
kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- \
  curl -s http://elasticsearch.observability.svc.cluster.local:9200/_cluster/health?pretty 2>/dev/null || \
  echo "Failed to connect to Elasticsearch"
echo ""
echo -e "${YELLOW}Elasticsearch Indices:${NC}"
kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- \
  curl -s http://elasticsearch.observability.svc.cluster.local:9200/_cat/indices?v 2>/dev/null || \
  echo "Failed to get indices"
echo ""

# Check Kibana
echo -e "${BLUE}=== Kibana Status ===${NC}"
kubectl get pods -n observability -l app=kibana
echo ""
echo -e "${YELLOW}Kibana API Status:${NC}"
kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- \
  curl -s http://kibana.observability.svc.cluster.local:5601/api/status 2>/dev/null | head -20 || \
  echo "Failed to connect to Kibana"
echo ""

# Check Filebeat
echo -e "${BLUE}=== Filebeat Status ===${NC}"
kubectl get pods -n observability -l app=filebeat
echo ""
echo -e "${YELLOW}Filebeat Logs (last 30 lines):${NC}"
kubectl logs -n observability -l app=filebeat --tail=30 | tail -30
echo ""

# Check Jaeger
echo -e "${BLUE}=== Jaeger Status ===${NC}"
kubectl get pods -n observability -l app=jaeger
kubectl get svc -n observability -l app=jaeger
echo ""
echo -e "${YELLOW}Jaeger Logs (last 30 lines):${NC}"
kubectl logs -n observability -l app=jaeger --tail=30 | tail -30
echo ""
echo -e "${YELLOW}Testing OTLP gRPC endpoint (port 4317):${NC}"
kubectl run grpcurl-test --image=fullstorydev/grpcurl:latest --rm -i --restart=Never -- \
  -plaintext jaeger-collector.observability.svc.cluster.local:4317 list 2>/dev/null || \
  echo "OTLP gRPC endpoint test - Note: This may fail but port should be reachable"
echo ""

# Check Application Services
echo -e "${BLUE}=== Application Services Status ===${NC}"
kubectl get pods -n quizhub
echo ""

# Check if services are configured with correct Jaeger endpoint
echo -e "${BLUE}=== OpenTelemetry Configuration Check ===${NC}"
echo -e "${YELLOW}Gateway:${NC}"
kubectl get configmap gateway-config -n quizhub -o jsonpath='{.data.appsettings\.json}' | grep -A2 "OpenTelemetry" || echo "Not found"
echo ""
echo -e "${YELLOW}User Service:${NC}"
kubectl get configmap user-service-config -n quizhub -o jsonpath='{.data.appsettings\.json}' | grep -A2 "OpenTelemetry" || echo "Not found"
echo ""
echo -e "${YELLOW}Quiz Service:${NC}"
kubectl get configmap quiz-service-config -n quizhub -o jsonpath='{.data.appsettings\.json}' | grep -A2 "OpenTelemetry" || echo "Not found"
echo ""
echo -e "${YELLOW}Result Service:${NC}"
kubectl get configmap result-service-config -n quizhub -o jsonpath='{.data.appsettings\.json}' | grep -A2 "OpenTelemetry" || echo "Not found"
echo ""

# Sample logs from application services
echo -e "${BLUE}=== Application Service Logs (checking for telemetry) ===${NC}"
echo -e "${YELLOW}Gateway logs (last 20 lines):${NC}"
kubectl logs -n quizhub -l app=gateway --tail=20 2>/dev/null | tail -20 || echo "No gateway logs"
echo ""
echo -e "${YELLOW}User Service logs (last 20 lines):${NC}"
kubectl logs -n quizhub -l app=user-service --tail=20 2>/dev/null | tail -20 || echo "No user-service logs"
echo ""

# Network connectivity test
echo -e "${BLUE}=== Network Connectivity Tests ===${NC}"
echo -e "${YELLOW}Testing if application pods can reach Jaeger OTLP endpoint:${NC}"
APP_POD=$(kubectl get pods -n quizhub -l app=gateway -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ ! -z "$APP_POD" ]; then
    echo "Testing from pod: $APP_POD"
    kubectl exec -n quizhub $APP_POD -- nc -zv jaeger-collector.observability.svc.cluster.local 4317 2>&1 || \
      kubectl exec -n quizhub $APP_POD -- ping -c 2 jaeger-collector.observability.svc.cluster.local 2>&1 || \
      echo "Network test failed"
else
    echo "No application pod found for testing"
fi
echo ""

# DNS resolution test
echo -e "${YELLOW}Testing DNS resolution:${NC}"
kubectl run dnsutils --image=tutum/dnsutils --rm -i --restart=Never -- \
  nslookup jaeger-collector.observability.svc.cluster.local 2>/dev/null || \
  echo "DNS resolution test failed"
echo ""

# Check for traces in Jaeger
echo -e "${BLUE}=== Jaeger Traces ===${NC}"
echo -e "${YELLOW}Querying Jaeger for services:${NC}"
kubectl run curl-test --image=curlimages/curl:latest --rm -i --restart=Never -- \
  curl -s http://jaeger-query.observability.svc.cluster.local:16686/api/services 2>/dev/null | head -50 || \
  echo "Failed to query Jaeger"
echo ""

echo -e "${GREEN}=== Diagnostics Complete ===${NC}"
echo -e "\n${YELLOW}Quick Actions:${NC}"
echo -e "1. Restart Filebeat: ${GREEN}kubectl rollout restart daemonset/filebeat -n observability${NC}"
echo -e "2. Restart Jaeger: ${GREEN}kubectl rollout restart deployment/jaeger -n observability${NC}"
echo -e "3. Restart App Services: ${GREEN}kubectl rollout restart deployment -n quizhub${NC}"
echo -e "4. Port-forward Kibana: ${GREEN}kubectl port-forward -n observability svc/kibana 5601:5601${NC}"
echo -e "5. Port-forward Jaeger: ${GREEN}kubectl port-forward -n observability svc/jaeger-query 16686:16686${NC}"
echo -e "6. View Elasticsearch logs: ${GREEN}kubectl logs -n observability -l app=elasticsearch --tail=100${NC}"
