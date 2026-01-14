# Quick Start Guide - Running the Portal

## Prerequisites

- ✅ Rancher Desktop running with Kubernetes enabled
- ✅ `kubectl` configured and accessible
- ✅ `docker` installed
- ✅ `node` and `npm` installed (Node.js v18+)

## Step-by-Step Setup

### Step 1: Build Demo Images

Build all demo service images (prevents ImagePullBackOff errors):

```bash
./scripts/build-demo-images.sh
```

This builds images for baseline and all demo branches. Takes 2-3 minutes.

### Step 2: Install NGINX Ingress Controller

```bash
./scripts/setup-ingress.sh
```

Wait for it to be ready (usually 1-2 minutes). You'll see:
```
✅ NGINX Ingress Controller installed successfully!
```

### Step 3: Deploy Baseline Services

```bash
./scripts/setup-baseline.sh
```

This deploys the baseline frontend, backend, and api services.

### Step 4: Set Up Hostname Resolution

Add hostnames to `/etc/hosts` so they resolve locally:

**Option A - Manual (Quick)**:
```bash
sudo nano /etc/hosts
```

Add this line:
```
127.0.0.1 baseline.local
```

**Option B - For all demo branches**:
```bash
sudo nano /etc/hosts
```

Add these lines:
```
127.0.0.1 baseline.local
127.0.0.1 feature-user-auth.local
127.0.0.1 feature-payment-gateway.local
127.0.0.1 feature-api-timeout-fix.local
127.0.0.1 feature-dashboard-v2.local
127.0.0.1 feature-security-patch.local
```

### Step 5: Start Port-Forward (Terminal 1)

Keep this terminal open - the port-forward must stay running:

```bash
kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 8080:80
```

You should see:
```
Forwarding from 127.0.0.1:8080 -> 80
Forwarding from [::1]:8080 -> 80
```

### Step 6: Install Portal Dependencies

In a **new terminal** (Terminal 2):

```bash
cd portal/backend
npm install
```

This installs Express, Kubernetes client, and other dependencies.

### Step 7: Start the Portal

Still in Terminal 2:

```bash
npm start
```

You should see:
```
🚀 Deployment Portal running on http://localhost:3000
📦 Kubernetes cluster: default
```

### Step 8: Access the Portal

Open your browser and go to:
```
http://localhost:3000
```

## Using the Portal

1. **Enter a branch name** (use one of the pre-built demo branches):
   - `user-auth`
   - `payment-gateway`
   - `api-timeout-fix`
   - `dashboard-v2`
   - `security-patch`

2. **Select services** to deploy (checkboxes for frontend, backend, api)

3. **Click "Deploy to Feature Namespace"**

4. **View deployed services** in the namespaces list below

5. **Access deployed services** by clicking "🌐 Open Service" button

## Accessing Services

After deploying, access services at:
- **Baseline**: `http://baseline.local:8080`
- **Feature branches**: `http://feature-{branch-name}.local:8080`

Example: If you deployed `user-auth`, access it at:
```
http://feature-user-auth.local:8080
```

## Troubleshooting

### Portal won't start
- Check Node.js version: `node --version` (should be v18+)
- Check if port 3000 is in use: `lsof -i :3000`
- Check npm install completed successfully

### Can't deploy from portal
- Verify kubectl access: `kubectl cluster-info`
- Check if cluster is running: `kubectl get nodes`

### DNS errors when accessing services
- Verify `/etc/hosts` entries are correct
- Make sure port-forward is still running
- Try accessing with `:8080` port: `http://baseline.local:8080`

### ImagePullBackOff errors
- Rebuild images: `./scripts/build-demo-images.sh`
- Or build specific branch: `./scripts/build-images.sh <branch-name>`

## Quick Commands Reference

```bash
# Build all images
./scripts/build-demo-images.sh

# Setup cluster
./scripts/setup-ingress.sh
./scripts/setup-baseline.sh

# Start portal
cd portal/backend
npm install
npm start

# Port-forward (in separate terminal)
kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 8080:80

# Check status
kubectl get pods -A
kubectl get ingress -A
```

## What's Running

After setup, you should have:

1. **Terminal 1**: Port-forward running (keep open)
2. **Terminal 2**: Portal server running (keep open)
3. **Browser**: Portal UI at `http://localhost:3000`
4. **Kubernetes**: Baseline services + any deployed feature branches

## Next Steps

- Deploy a demo branch using the portal
- Access the deployed services via their hostnames
- Try deploying multiple branches simultaneously
- Explore the namespace isolation
