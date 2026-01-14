#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🛑 Stopping all services..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found."
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "⚠️  Cannot connect to Kubernetes cluster."
    exit 1
fi

# Stop all feature namespaces
echo ""
echo "🗑️  Stopping feature branch deployments..."
FEATURE_NAMESPACES=$(kubectl get namespaces -l type=feature-branch -o name 2>/dev/null | cut -d/ -f2 || true)

if [ -n "$FEATURE_NAMESPACES" ]; then
    echo "$FEATURE_NAMESPACES" | while read -r ns; do
        echo "   Stopping namespace: $ns"
        kubectl delete namespace "$ns" --ignore-not-found=true --wait=false
    done
    echo "   ✅ Feature namespaces deletion initiated"
else
    echo "   ℹ️  No feature namespaces found"
fi

# Stop baseline services
echo ""
echo "🛑 Stopping baseline services..."
kubectl delete -f "$PROJECT_ROOT/k8s/baseline/ingress-baseline.yaml" --ignore-not-found=true --wait=false
kubectl delete -f "$PROJECT_ROOT/k8s/baseline/api.yaml" --ignore-not-found=true --wait=false
kubectl delete -f "$PROJECT_ROOT/k8s/baseline/backend.yaml" --ignore-not-found=true --wait=false
kubectl delete -f "$PROJECT_ROOT/k8s/baseline/frontend.yaml" --ignore-not-found=true --wait=false
echo "   ✅ Baseline services deletion initiated"

# Wait for deletions to complete (optional, can be removed for faster execution)
echo ""
echo "⏳ Waiting for resources to be deleted..."
sleep 3

# Check for port-forward processes
echo ""
echo "🔍 Checking for port-forward processes..."
PORT_FORWARD_PIDS=$(ps aux | grep "kubectl port-forward.*ingress-nginx-controller" | grep -v grep | awk '{print $2}' || true)

if [ -n "$PORT_FORWARD_PIDS" ]; then
    echo "   Found port-forward processes: $PORT_FORWARD_PIDS"
    read -p "   Do you want to kill port-forward processes? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "$PORT_FORWARD_PIDS" | xargs kill 2>/dev/null || true
        echo "   ✅ Port-forward processes stopped"
    fi
else
    echo "   ℹ️  No port-forward processes found"
fi

# Check for portal processes
echo ""
echo "🔍 Checking for portal server processes..."
PORTAL_PIDS=$(ps aux | grep "node.*portal/backend/server.js\|npm.*start" | grep -v grep | awk '{print $2}' || true)

if [ -n "$PORTAL_PIDS" ]; then
    echo "   Found portal processes: $PORTAL_PIDS"
    read -p "   Do you want to kill portal server processes? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "$PORTAL_PIDS" | xargs kill 2>/dev/null || true
        echo "   ✅ Portal server processes stopped"
    fi
else
    echo "   ℹ️  No portal server processes found"
fi

echo ""
echo "✅ Stop process completed!"
echo ""
echo "📋 Remaining resources:"
echo "   Namespaces:"
kubectl get namespaces -l type=feature-branch 2>/dev/null || echo "   (none)"
echo ""
echo "   Baseline services:"
kubectl get deployments -n default 2>/dev/null | grep -E "frontend|backend|api" || echo "   (none)"
echo ""
echo "💡 To completely remove everything, run: ./scripts/cleanup.sh"
