#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧹 Cleaning up demo environment..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found."
    exit 1
fi

# Delete all feature namespaces
echo "🗑️  Deleting feature namespaces..."
FEATURE_NAMESPACES=$(kubectl get namespaces -l type=feature-branch -o name 2>/dev/null | cut -d/ -f2 || true)

if [ -n "$FEATURE_NAMESPACES" ]; then
    echo "$FEATURE_NAMESPACES" | while read -r ns; do
        echo "   Deleting namespace: $ns"
        kubectl delete namespace "$ns" --ignore-not-found=true
    done
else
    echo "   No feature namespaces found"
fi

# Delete baseline services
echo "🗑️  Deleting baseline services..."
kubectl delete -f "$PROJECT_ROOT/k8s/baseline/ingress-baseline.yaml" --ignore-not-found=true
kubectl delete -f "$PROJECT_ROOT/k8s/baseline/api.yaml" --ignore-not-found=true
kubectl delete -f "$PROJECT_ROOT/k8s/baseline/backend.yaml" --ignore-not-found=true
kubectl delete -f "$PROJECT_ROOT/k8s/baseline/frontend.yaml" --ignore-not-found=true

echo ""
read -p "Do you want to delete NGINX Ingress Controller? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Deleting NGINX Ingress Controller..."
    kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml --ignore-not-found=true
fi

echo ""
echo "✅ Cleanup complete!"
