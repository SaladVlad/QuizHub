#!/bin/bash

# Script to start a stopped AKS cluster

set -e

RESOURCE_GROUP="quizhub-rg"
CLUSTER_NAME="quizhub-aks"

echo "=== Starting AKS Cluster ==="
echo "Resource Group: $RESOURCE_GROUP"
echo "Cluster Name: $CLUSTER_NAME"
echo ""

echo "Starting cluster... This may take a few minutes."
az aks start --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME"

echo ""
echo "✅ Cluster started successfully!"
echo ""
echo "Getting credentials..."
az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --overwrite-existing

echo ""
echo "Checking cluster status..."
kubectl get nodes

echo ""
echo "✅ Cluster is ready!"
echo ""
echo "Your workloads should start automatically."
echo "To check pod status: kubectl get pods -A"
