#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Setting up baseline services..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster. Please ensure your cluster is running."
    exit 1
fi

# Check if ingress controller is installed
if ! kubectl get namespace ingress-nginx &> /dev/null; then
    echo "⚠️  NGINX Ingress Controller not found. Please run setup-ingress.sh first."
    exit 1
fi

echo "📦 Deploying baseline services to default namespace..."

# Deploy baseline services
kubectl apply -f "$PROJECT_ROOT/k8s/baseline/frontend.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/baseline/backend.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/baseline/api.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/baseline/ingress-baseline.yaml"

echo "⏳ Waiting for baseline services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n default || true
kubectl wait --for=condition=available --timeout=300s deployment/backend -n default || true
kubectl wait --for=condition=available --timeout=300s deployment/api -n default || true

echo ""
echo "✅ Baseline services deployed successfully!"
echo ""
echo "📋 Service Status:"
kubectl get deployments -n default
kubectl get services -n default
kubectl get ingress -n default

echo ""
echo "🌐 Access baseline services at:"
echo "   http://baseline.local (requires /etc/hosts entry or port-forward)"
echo ""
echo "   To set up port-forward:"
echo "   kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 8080:80"
echo "   Then access: http://baseline.local:8080"
