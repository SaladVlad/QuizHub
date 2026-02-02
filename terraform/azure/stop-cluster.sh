#!/bin/bash

# Script to stop AKS cluster to save costs
# This deallocates the VMs but preserves your cluster configuration

set -e

RESOURCE_GROUP="quizhub-rg"
CLUSTER_NAME="quizhub-aks"

echo "=== Stopping AKS Cluster ==="
echo "Resource Group: $RESOURCE_GROUP"
echo "Cluster Name: $CLUSTER_NAME"
echo ""
echo "⚠️  This will stop all running workloads and deallocate VMs."
echo "⚠️  You will not be charged for VM compute while stopped."
echo "⚠️  You will still be charged for storage and other resources."
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Stopping cluster... This may take a few minutes."
az aks stop --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME"

echo ""
echo "✅ Cluster stopped successfully!"
echo ""
echo "To start the cluster again, run:"
echo "  ./start-cluster.sh"
echo ""
echo "Current charges while stopped:"
echo "  ✓ VM compute: $0/hour"
echo "  ✗ Storage (disks, ACR): Still charged"
echo "  ✗ Static Public IP: Still charged (~$3/month)"
echo "  ✗ Log Analytics: Still charged (if ingesting data)"
