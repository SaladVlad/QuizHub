#!/bin/bash

# Script to check AKS cluster status and estimate costs

set -e

RESOURCE_GROUP="quizhub-rg"
CLUSTER_NAME="quizhub-aks"

echo "=== AKS Cluster Status ==="
echo ""

# Check if cluster exists
if ! az aks show --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" &>/dev/null; then
    echo "❌ Cluster not found!"
    echo "Resource Group: $RESOURCE_GROUP"
    echo "Cluster Name: $CLUSTER_NAME"
    exit 1
fi

# Get power state
POWER_STATE=$(az aks show --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --query "powerState.code" -o tsv 2>/dev/null || echo "Unknown")

echo "Cluster: $CLUSTER_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo "Power State: $POWER_STATE"
echo ""

if [[ "$POWER_STATE" == "Running" ]]; then
    echo "✅ Cluster is RUNNING"
    echo ""
    echo "💰 Estimated hourly cost: ~$0.04-0.06/hour (Standard_B2s nodes)"
    echo ""
    
    # Get node count
    NODE_COUNT=$(kubectl get nodes --no-headers 2>/dev/null | wc -l || echo "0")
    echo "Active Nodes: $NODE_COUNT"
    
    if [[ "$NODE_COUNT" -gt 0 ]]; then
        echo ""
        echo "Node Details:"
        kubectl get nodes -o wide
    fi
    
    echo ""
    echo "To stop the cluster and save money:"
    echo "  ./stop-cluster.sh"
    
elif [[ "$POWER_STATE" == "Stopped" ]]; then
    echo "🛑 Cluster is STOPPED"
    echo ""
    echo "💰 Current VM compute cost: $0/hour"
    echo "⚠️  Still paying for: Storage, ACR, Public IP (~$10-15/month)"
    echo ""
    echo "To start the cluster:"
    echo "  ./start-cluster.sh"
    
else
    echo "⚠️  Cluster state: $POWER_STATE"
fi

echo ""
echo "=== Resource Overview ==="

# Check ACR
ACR_NAME=$(az acr list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null || echo "")
if [[ -n "$ACR_NAME" ]]; then
    ACR_SIZE=$(az acr show-usage --name "$ACR_NAME" --query "value[?name=='Size'].currentValue" -o tsv 2>/dev/null || echo "0")
    ACR_SIZE_GB=$(echo "scale=2; $ACR_SIZE / 1073741824" | bc 2>/dev/null || echo "0")
    echo "Container Registry: $ACR_NAME"
    echo "  Storage Used: ${ACR_SIZE_GB} GB"
    echo "  Cost: ~$5/month (Basic tier) + storage"
fi

# Check Public IP
PUBLIC_IP=$(az network public-ip show --resource-group "$RESOURCE_GROUP" --name quizhub-ingress-ip --query "ipAddress" -o tsv 2>/dev/null || echo "None")
if [[ "$PUBLIC_IP" != "None" ]]; then
    echo ""
    echo "Public IP: $PUBLIC_IP"
    echo "  Cost: ~$3/month (static IP)"
fi

echo ""
echo "=== Cost Management Tips ==="
echo "• Stop cluster when not in use: ./stop-cluster.sh"
echo "• Delete cluster completely: terraform destroy"
echo "• Monitor costs: az consumption usage list"
echo "• Set up cost alerts in Azure Portal"
