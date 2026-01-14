# Kubernetes Shared Cluster Demo

This project demonstrates a smart approach to microservices development and testing in Kubernetes using shared clusters with namespace isolation and ingress routing. This implementation showcases the architecture described in the [blog post](https://dev.to/ravidasari/accelerating-microservices-development-and-testing-in-kubernetes-shared-clusters-smart-isolation-k7o).

## Architecture Overview

The demo environment consists of:

- **Baseline Cluster**: Default namespace hosting baseline versions of all services (frontend, backend, api)
- **Feature Namespaces**: Isolated namespaces (`feature-{branch-name}`) for deploying modified services
- **NGINX Ingress Controller**: Routes traffic based on hostnames (e.g., `baseline.local`, `feature-xyz.local`)
- **Deployment Portal**: Web-based UI for deploying feature branches to isolated namespaces

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐      ┌──────────────────────────┐   │
│  │  Default NS       │      │  Feature Namespaces      │   │
│  │  (Baseline)       │      │  (feature-{branch})      │   │
│  ├──────────────────┤      ├──────────────────────────┤   │
│  │ • frontend        │      │ • frontend (modified)    │   │
│  │ • backend         │      │ • backend (modified)     │   │
│  │ • api             │      │ • api (modified)         │   │
│  └──────────────────┘      └──────────────────────────┘   │
│           │                            │                    │
│           └────────────┬────────────────┘                    │
│                        │                                     │
│                 ┌──────▼──────┐                             │
│                 │   Ingress   │                             │
│                 │ Controller  │                             │
│                 └──────┬──────┘                             │
│                        │                                     │
│           ┌────────────┴────────────┐                       │
│           │                         │                        │
│    baseline.local          feature-*.local                   │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Rancher Desktop** (or any local Kubernetes cluster)
- **kubectl** configured to access your cluster
- **Docker** for building container images
- **Node.js** (v18+) for running the deployment portal

## Quick Start

### 1. Build Demo Service Images

**Important**: Build all demo images upfront to avoid ImagePullBackOff errors.

Build baseline and demo branch images:

```bash
./scripts/build-demo-images.sh
```

This creates images for:
- **Baseline**: `sddp-frontend:latest`, `sddp-backend:latest`, `sddp-api:latest`
- **Demo branches**:
  - `user-auth` (creates namespace: `feature-user-auth`)
  - `payment-gateway` (creates namespace: `feature-payment-gateway`)
  - `api-timeout-fix` (creates namespace: `feature-api-timeout-fix`)
  - `dashboard-v2` (creates namespace: `feature-dashboard-v2`)
  - `security-patch` (creates namespace: `feature-security-patch`)

Or build a specific branch:

```bash
./scripts/build-images.sh feature-user-auth
```

**Note**: For Rancher Desktop, images built locally are automatically available to the cluster. For other setups, you may need to load images into your cluster.

### 2. Install NGINX Ingress Controller

```bash
./scripts/setup-ingress.sh
```

This installs the NGINX Ingress Controller in your cluster. Wait for it to be ready (usually 1-2 minutes).

### 3. Deploy Baseline Services

```bash
./scripts/setup-baseline.sh
```

This deploys the baseline services (frontend, backend, api) to the `default` namespace.

### 4. Start the Deployment Portal

```bash
cd portal/backend
npm install
npm start
```

The portal will be available at `http://localhost:3000`

### 5. Set Up Hostname Resolution

**Important**: You need to add hostname entries to `/etc/hosts` for the demo hostnames to resolve.

**Option A: Use the setup script (Recommended)**

```bash
sudo ./scripts/setup-hosts.sh
```

This automatically adds all demo hostnames to `/etc/hosts`.

**Option B: Manual /etc/hosts setup**

Edit `/etc/hosts` (requires sudo) and add:

```
127.0.0.1 baseline.local
127.0.0.1 feature-user-auth.local
127.0.0.1 feature-payment-gateway.local
127.0.0.1 feature-api-timeout-fix.local
127.0.0.1 feature-dashboard-v2.local
127.0.0.1 feature-security-patch.local
```

### 6. Access Services

Set up port-forward for the ingress controller:

```bash
kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 8080:80
```

**Keep this terminal open** - the port-forward must stay running.

Then access services at:
- Baseline: `http://baseline.local:8080`
- Feature branches: `http://feature-{branch-name}.local:8080`

**Note**: If you get `DNS_PROBE_FINISHED_NXDOMAIN`, make sure:
1. `/etc/hosts` entries are added (run `sudo ./scripts/setup-hosts.sh`)
2. Port-forward is running in a separate terminal
3. You're accessing via `http://baseline.local:8080` (not just `baseline.local`)

## Usage

### Deploying a Feature Branch

**Recommended Demo Branch Names** (images pre-built):
- `user-auth` → namespace: `feature-user-auth`
- `payment-gateway` → namespace: `feature-payment-gateway`
- `api-timeout-fix` → namespace: `feature-api-timeout-fix`
- `dashboard-v2` → namespace: `feature-dashboard-v2`
- `security-patch` → namespace: `feature-security-patch`

**Steps**:
1. Open the deployment portal at `http://localhost:3000`
2. Enter one of the demo branch names above (or any branch name if you've built the images)
3. Select which services to deploy (frontend, backend, api)
4. Click "Deploy to Feature Namespace"

The portal will:
- Create a new namespace: `feature-{branch-name}`
- Deploy selected services to that namespace
- Create ingress rules for routing traffic
- Display the deployment status

**Note**: If you use a branch name that doesn't have pre-built images, you'll need to build them first:
```bash
./scripts/build-images.sh <branch-name>
```

### Viewing Deployed Services

The portal shows all feature namespaces with:
- Service status and readiness
- Access links
- Option to delete namespaces

### Accessing Services

Once deployed, access services via:
- `http://feature-{branch-name}.local:8080` (with port-forward)
- Services are isolated in their own namespaces
- Unchanged services fall back to baseline in default namespace

## Project Structure

```
sddp/
├── k8s/
│   ├── baseline/              # Baseline service manifests
│   │   ├── frontend.yaml
│   │   ├── backend.yaml
│   │   ├── api.yaml
│   │   └── ingress-baseline.yaml
│   └── templates/            # Templates for feature deployments
│       ├── namespace-template.yaml
│       ├── deployment-template.yaml
│       └── ingress-template.yaml
├── portal/
│   ├── frontend/             # Web UI
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   └── backend/              # Deployment API
│       ├── server.js
│       ├── deployer.js
│       └── package.json
├── services/                 # Demo service source code
│   ├── frontend/
│   ├── backend/
│   └── api/
└── scripts/                  # Setup and utility scripts
    ├── setup-ingress.sh
    ├── setup-baseline.sh
    ├── setup-hosts.sh        # Set up /etc/hosts entries for demo hostnames
    ├── build-images.sh       # Build images for a specific branch
    ├── build-demo-images.sh  # Build all demo branch images upfront
    └── cleanup.sh
```

## Demo Services

The demo includes three simple microservices:

### Frontend
- **Image**: `sddp-frontend`
- **Port**: 80
- **Type**: Nginx-based web UI
- **Purpose**: Demonstrates frontend service isolation

### Backend
- **Image**: `sddp-backend`
- **Port**: 3000
- **Type**: Node.js HTTP server
- **Purpose**: Demonstrates backend API service

### API
- **Image**: `sddp-api`
- **Port**: 3001
- **Type**: Node.js HTTP server
- **Purpose**: Demonstrates REST API service

Each service displays its namespace, branch name, and version when accessed.

## Key Features Demonstrated

✅ **Namespace Isolation**: Each feature branch gets its own isolated namespace  
✅ **Selective Deployment**: Only selected services deploy to feature namespace  
✅ **Ingress Routing**: Traffic routes to correct namespace based on hostname  
✅ **Shared Baseline**: Unchanged services remain in default namespace  
✅ **Quick Deployment**: Portal enables sub-minute deployments  
✅ **Cost Efficiency**: Shared infrastructure reduces resource usage  

## Troubleshooting

### Services Not Accessible

1. **Check ingress controller**: `kubectl get pods -n ingress-nginx`
2. **Verify port-forward**: Ensure port-forward is running
3. **Check /etc/hosts**: Verify hostname entries are correct
4. **Check ingress rules**: `kubectl get ingress -A`

### Images Not Found / ImagePullBackOff

**Solution**: Build images for your branch name before deploying:

```bash
# Build images for a specific branch
./scripts/build-images.sh <branch-name>

# Or build all demo images upfront
./scripts/build-demo-images.sh
```

**Recommended**: Run `./scripts/build-demo-images.sh` before starting the demo to pre-build all images.

For Rancher Desktop, images built locally should be available. For other clusters:
- Use `docker save` and `docker load` to transfer images
- Or use a container registry and update image pull policies

**Demo branch names with pre-built images**:
- `user-auth`
- `payment-gateway`
- `api-timeout-fix`
- `dashboard-v2`
- `security-patch`

### Portal Can't Deploy

1. **Check kubectl access**: `kubectl cluster-info`
2. **Verify permissions**: Portal needs cluster admin or appropriate RBAC
3. **Check logs**: `kubectl logs -n default <pod-name>`

### Services Not Ready

1. **Check pod status**: `kubectl get pods -A`
2. **View pod logs**: `kubectl logs <pod-name> -n <namespace>`
3. **Check events**: `kubectl get events -n <namespace>`

## Cleanup

To remove all demo resources:

```bash
./scripts/cleanup.sh
```

This removes:
- All feature namespaces
- Baseline services
- Optionally, the NGINX Ingress Controller

## Extending the Demo

### Adding New Services

1. Create service source in `services/`
2. Add Dockerfile
3. Update `portal/backend/deployer.js` with service configuration
4. Add baseline manifest in `k8s/baseline/`
5. Update portal UI to include new service

### Customizing Images

Modify the Dockerfiles in `services/` and rebuild:

```bash
./scripts/build-images.sh <branch-name>
```

### Integrating with Git

The portal backend can be extended to:
- Detect changed services from git diffs
- Automatically deploy on branch creation
- Clean up on branch deletion

## Cost Savings Example

Traditional approach (full environment per branch):
- 100 developers × 50 services × 2 vCPU × 4GB RAM
- Estimated cost: ~$832,000/year

Shared cluster approach:
- Baseline: ~$35,000/year
- Feature sandboxes: ~$33,000/year
- **Total: ~$68,000/year**
- **Savings: ~92%**

## References

- [Blog Post: Accelerating Microservices Development](https://dev.to/ravidasari/accelerating-microservices-development-and-testing-in-kubernetes-shared-clusters-smart-isolation-k7o)
- [Kubernetes Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)

## License

MIT
