# Troubleshooting Guide

## DNS_PROBE_FINISHED_NXDOMAIN Error

**Symptom**: When accessing `http://baseline.local:8080`, you get `DNS_PROBE_FINISHED_NXDOMAIN`.

**Cause**: The hostname `baseline.local` is not resolving because it's not in your `/etc/hosts` file.

**Solution**:

1. **Add hostname entries** (choose one):

   **Option A - Use the setup script**:
   ```bash
   sudo ./scripts/setup-hosts.sh
   ```

   **Option B - Manual edit**:
   ```bash
   sudo nano /etc/hosts
   ```
   
   Add this line:
   ```
   127.0.0.1 baseline.local
   ```

2. **Verify port-forward is running**:
   ```bash
   kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 8080:80
   ```
   
   Keep this terminal open - the port-forward must stay running.

3. **Access the service**:
   - Open browser: `http://baseline.local:8080`
   - Make sure you include `:8080` port

## ImagePullBackOff Error

**Symptom**: Pods show `ImagePullBackOff` status.

**Solution**: Build images for your branch name:

```bash
# Build all demo images
./scripts/build-demo-images.sh

# Or build for a specific branch
./scripts/build-images.sh <branch-name>
```

## Port-Forward Not Working

**Symptom**: Can't connect even with correct hostname.

**Check**:
1. Is port-forward running? Check the terminal where you ran it
2. Is the ingress controller running?
   ```bash
   kubectl get pods -n ingress-nginx
   ```
3. Try a different port:
   ```bash
   kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 8081:80
   ```
   Then access: `http://baseline.local:8081`

## Services Not Ready

**Symptom**: Services show as not ready in the portal.

**Check**:
```bash
# Check pod status
kubectl get pods -A

# Check specific namespace
kubectl get pods -n feature-<branch-name>

# View pod logs
kubectl logs <pod-name> -n <namespace>

# Check events
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
```

## Ingress Not Routing

**Symptom**: 404 or connection refused when accessing via hostname.

**Check**:
```bash
# Verify ingress exists
kubectl get ingress -A

# Check ingress details
kubectl describe ingress <ingress-name> -n <namespace>

# Verify ingress controller is ready
kubectl get pods -n ingress-nginx
```

## Quick Health Check

Run these commands to verify everything is set up:

```bash
# 1. Check ingress controller
kubectl get pods -n ingress-nginx

# 2. Check baseline services
kubectl get pods -n default

# 3. Check ingress rules
kubectl get ingress -A

# 4. Verify /etc/hosts
grep baseline.local /etc/hosts

# 5. Check port-forward (should be running in another terminal)
# Run this to test:
curl -H "Host: baseline.local" http://localhost:8080
```

## Common Issues Summary

| Issue | Quick Fix |
|-------|-----------|
| DNS_PROBE_FINISHED_NXDOMAIN | Run `sudo ./scripts/setup-hosts.sh` |
| ImagePullBackOff | Run `./scripts/build-demo-images.sh` |
| Connection refused | Start port-forward: `kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 8080:80` |
| 404 Not Found | Check ingress exists: `kubectl get ingress -A` |
| Services not ready | Check pod logs: `kubectl logs <pod-name> -n <namespace>` |
