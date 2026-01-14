#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔨 Building demo images for feature branches..."

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ docker not found. Please install Docker first."
    exit 1
fi

# Demo branch names for the showcase
# Note: These will create namespaces like feature-user-auth, feature-payment-gateway, etc.
DEMO_BRANCHES=(
    "user-auth"
    "payment-gateway"
    "api-timeout-fix"
    "dashboard-v2"
    "security-patch"
)

echo "📦 Building images for the following demo branches:"
for branch in "${DEMO_BRANCHES[@]}"; do
    echo "   - $branch"
done
echo ""

# Build baseline images (latest tag)
echo "🏗️  Building baseline images (tag: latest)..."
"$SCRIPT_DIR/build-images.sh" latest

# Build images for each demo branch
for BRANCH_NAME in "${DEMO_BRANCHES[@]}"; do
    echo ""
    echo "🏗️  Building images for branch: $BRANCH_NAME"
    "$SCRIPT_DIR/build-images.sh" "$BRANCH_NAME"
done

echo ""
echo "✅ All demo images built successfully!"
echo ""
echo "📋 Summary of built images:"
docker images | grep sddp | head -20

echo ""
echo "💡 Demo branch names to use in the portal:"
for branch in "${DEMO_BRANCHES[@]}"; do
    echo "   - $branch"
done
echo ""
echo "💡 These images are now available for deployment!"
