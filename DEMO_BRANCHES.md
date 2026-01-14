# Demo Branch Names

This file lists the pre-built demo branch names that are ready to use in the deployment portal.

## Pre-built Demo Branches

Run `./scripts/build-demo-images.sh` to build images for these branches:

1. **user-auth**
   - Use case: New authentication feature
   - Namespace: `feature-user-auth`
   - Hostname: `feature-user-auth.local`
   - Enter in portal: `user-auth`

2. **payment-gateway**
   - Use case: Payment integration feature
   - Namespace: `feature-payment-gateway`
   - Hostname: `feature-payment-gateway.local`
   - Enter in portal: `payment-gateway`

3. **api-timeout-fix**
   - Use case: Bug fix for API timeout issues
   - Namespace: `feature-api-timeout-fix`
   - Hostname: `feature-api-timeout-fix.local`
   - Enter in portal: `api-timeout-fix`

4. **dashboard-v2**
   - Use case: Dashboard redesign feature
   - Namespace: `feature-dashboard-v2`
   - Hostname: `feature-dashboard-v2.local`
   - Enter in portal: `dashboard-v2`

5. **security-patch**
   - Use case: Critical security hotfix
   - Namespace: `feature-security-patch`
   - Hostname: `feature-security-patch.local`
   - Enter in portal: `security-patch`

## Using Demo Branches

1. **Build all demo images** (recommended before starting):
   ```bash
   ./scripts/build-demo-images.sh
   ```

2. **Start the portal**:
   ```bash
   cd portal/backend
   npm install
   npm start
   ```

3. **Deploy a branch**:
   - Open `http://localhost:3000`
   - Enter one of the branch names above
   - Select services to deploy
   - Click "Deploy to Feature Namespace"

## Custom Branch Names

If you want to use a different branch name:

1. Build images for that branch:
   ```bash
   ./scripts/build-images.sh your-branch-name
   ```

2. Use `your-branch-name` in the portal

**Note**: Branch names are sanitized (lowercased, special chars replaced with hyphens) for Docker image tags.
