#!/bin/bash

set -e

echo "🔧 Setting up NGINX Ingress Controller..."

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

echo "📦 Installing NGINX Ingress Controller..."

# Install NGINX Ingress using kubectl apply
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

echo "⏳ Waiting for NGINX Ingress Controller to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

echo "✅ NGINX Ingress Controller installed successfully!"

# Get ingress service details
echo ""
echo "📋 Ingress Controller Status:"
kubectl get svc -n ingress-nginx

echo ""
echo "💡 To access services locally, add these to your /etc/hosts:"
echo "   127.0.0.1 baseline.local"
echo "   127.0.0.1 feature-*.local"
echo ""
echo "   Or use port-forward:"
echo "   kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 8080:80"
