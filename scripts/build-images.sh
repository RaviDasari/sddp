#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔨 Building demo service images..."

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ docker not found. Please install Docker first."
    exit 1
fi

# Build images with branch name as tag
BRANCH_NAME=${1:-"latest"}

# Sanitize branch name for Docker tag (lowercase, replace invalid chars with hyphens)
BRANCH_TAG=$(echo "$BRANCH_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')

echo "📦 Building images with tag: $BRANCH_TAG"
echo ""

# Build frontend
echo "Building frontend..."
cd "$PROJECT_ROOT/services/frontend"
docker build -t sddp-frontend:$BRANCH_TAG .

# Build backend
echo "Building backend..."
cd "$PROJECT_ROOT/services/backend"
docker build -t sddp-backend:$BRANCH_TAG .

# Build api
echo "Building api..."
cd "$PROJECT_ROOT/services/api"
docker build -t sddp-api:$BRANCH_TAG .

echo ""
echo "✅ All images built successfully!"
echo ""
echo "📋 Built images:"
docker images | grep sddp

echo ""
echo "💡 To load images into Rancher Desktop/Kind:"
echo "   docker save sddp-frontend:$BRANCH_TAG sddp-backend:$BRANCH_TAG sddp-api:$BRANCH_TAG | docker load"
