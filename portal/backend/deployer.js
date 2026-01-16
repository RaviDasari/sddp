const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('yaml');

const execAsync = promisify(exec);

// Service configurations
const SERVICES = {
  frontend: {
    image: 'sddp-frontend',
    port: 80,
    servicePort: 80,
    ingressPath: '/'
  },
  backend: {
    image: 'sddp-backend',
    port: 3000,
    servicePort: 3000,
    ingressPath: '/backend'
  },
  api: {
    image: 'sddp-api',
    port: 3001,
    servicePort: 3001,
    ingressPath: '/api'
  }
};

class K8sDeployer {
  constructor() {
    this.templatesPath = path.join(__dirname, '../../k8s/templates');
  }

  async executeKubectl(command) {
    try {
      const { stdout, stderr } = await execAsync(`kubectl ${command}`);
      if (stderr && !stderr.includes('Warning')) {
        console.warn('kubectl stderr:', stderr);
      }
      return stdout;
    } catch (error) {
      throw new Error(`kubectl command failed: ${error.message}`);
    }
  }

  async namespaceExists(namespace) {
    try {
      await this.executeKubectl(`get namespace ${namespace}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async createNamespace(branchName) {
    const namespace = `feature-${branchName}`;
    const exists = await this.namespaceExists(namespace);
    
    if (exists) {
      console.log(`Namespace ${namespace} already exists`);
      return namespace;
    }

    const templatePath = path.join(this.templatesPath, 'namespace-template.yaml');
    let template = await fs.readFile(templatePath, 'utf-8');
    template = template.replace(/\{\{BRANCH_NAME\}\}/g, branchName);

    const tempFile = `/tmp/namespace-${branchName}.yaml`;
    await fs.writeFile(tempFile, template);

    await this.executeKubectl(`apply -f ${tempFile}`);
    await fs.unlink(tempFile);

    console.log(`Created namespace: ${namespace}`);
    return namespace;
  }

  async deployService(branchName, serviceName) {
    const namespace = `feature-${branchName}`;
    const serviceConfig = SERVICES[serviceName];
    
    if (!serviceConfig) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    const templatePath = path.join(this.templatesPath, 'deployment-template.yaml');
    let template = await fs.readFile(templatePath, 'utf-8');
    
    template = template
      .replace(/\{\{SERVICE_NAME\}\}/g, serviceName)
      .replace(/\{\{BRANCH_NAME\}\}/g, branchName)
      .replace(/\{\{IMAGE_NAME\}\}/g, serviceConfig.image)
      .replace(/\{\{PORT\}\}/g, serviceConfig.port.toString())
      .replace(/\{\{SERVICE_PORT\}\}/g, serviceConfig.servicePort.toString());

    const tempFile = `/tmp/deployment-${branchName}-${serviceName}.yaml`;
    await fs.writeFile(tempFile, template);

    await this.executeKubectl(`apply -f ${tempFile} -n ${namespace}`);
    await fs.unlink(tempFile);

    console.log(`Deployed ${serviceName} to ${namespace}`);
    return { service: serviceName, namespace };
  }

  async createIngress(branchName, deployedServices) {
    const namespace = `feature-${branchName}`;
    const allServiceNames = Object.keys(SERVICES);
    
    // Build ingress paths - deployed services go to feature namespace, others to baseline
    // We need separate ingress rules for cross-namespace routing
    const featurePaths = [];
    const baselinePaths = [];
    
    for (const serviceName of allServiceNames) {
      const config = SERVICES[serviceName];
      if (deployedServices.includes(serviceName)) {
        featurePaths.push({
          name: serviceName,
          path: config.ingressPath,
          port: config.servicePort,
          namespace: namespace
        });
      } else {
        baselinePaths.push({
          name: serviceName,
          path: config.ingressPath,
          port: config.servicePort,
          namespace: 'default'
        });
      }
    }

    // Generate feature namespace ingress for deployed services
    const featurePathsYaml = featurePaths.map(p => `      - path: ${p.path}
        pathType: Prefix
        backend:
          service:
            name: ${p.name}
            port:
              number: ${p.port}`).join('\n');

    const featureIngressYaml = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: feature-${branchName}-ingress
  namespace: ${namespace}
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: feature-${branchName}.local
    http:
      paths:
${featurePathsYaml}
`;

    const featureTempFile = `/tmp/ingress-${branchName}-feature.yaml`;
    await fs.writeFile(featureTempFile, featureIngressYaml);
    await this.executeKubectl(`apply -f ${featureTempFile}`);
    await fs.unlink(featureTempFile);

    // Generate baseline namespace ingress for fallback services (if any)
    if (baselinePaths.length > 0) {
      const baselinePathsYaml = baselinePaths.map(p => `      - path: ${p.path}
        pathType: Prefix
        backend:
          service:
            name: ${p.name}
            port:
              number: ${p.port}`).join('\n');

      const baselineIngressYaml = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: feature-${branchName}-baseline-fallback
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: feature-${branchName}.local
    http:
      paths:
${baselinePathsYaml}
`;

      const baselineTempFile = `/tmp/ingress-${branchName}-baseline.yaml`;
      await fs.writeFile(baselineTempFile, baselineIngressYaml);
      await this.executeKubectl(`apply -f ${baselineTempFile}`);
      await fs.unlink(baselineTempFile);
      
      console.log(`Created baseline fallback ingress for: ${baselinePaths.map(p => p.name).join(', ')}`);
    }

    console.log(`Created ingress for ${namespace}`);
  }

  async deploy(branchName, services) {
    try {
      // Create namespace
      await this.createNamespace(branchName);

      // Deploy each selected service
      const deployedServices = [];
      for (const service of services) {
        await this.deployService(branchName, service);
        deployedServices.push(service);
      }

      // Determine fallback services
      const allServiceNames = Object.keys(SERVICES);
      const fallbackServices = allServiceNames.filter(s => !services.includes(s));

      // Create ingress (handles both deployed and fallback routing)
      await this.createIngress(branchName, deployedServices);

      return {
        success: true,
        namespace: `feature-${branchName}`,
        services: deployedServices,
        fallbackServices: fallbackServices,
        hostname: `feature-${branchName}.local`
      };
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  async listNamespaces() {
    try {
      const output = await this.executeKubectl('get namespaces -l type=feature-branch -o json');
      const data = JSON.parse(output);
      return data.items.map(item => ({
        name: item.metadata.name,
        branch: item.metadata.labels?.branch || '',
        created: item.metadata.creationTimestamp
      }));
    } catch (error) {
      console.error('Error listing namespaces:', error);
      return [];
    }
  }

  async getServices(namespace) {
    try {
      const output = await this.executeKubectl(`get services -n ${namespace} -o json`);
      const data = JSON.parse(output);
      return data.items.map(item => ({
        name: item.metadata.name,
        namespace: item.metadata.namespace,
        type: item.spec.type,
        ports: item.spec.ports
      }));
    } catch (error) {
      console.error(`Error getting services for ${namespace}:`, error);
      return [];
    }
  }

  async getDeployments(namespace) {
    try {
      const output = await this.executeKubectl(`get deployments -n ${namespace} -o json`);
      const data = JSON.parse(output);
      return data.items.map(item => ({
        name: item.metadata.name,
        namespace: item.metadata.namespace,
        replicas: item.spec.replicas,
        readyReplicas: item.status.readyReplicas || 0,
        branch: item.metadata.labels?.branch || ''
      }));
    } catch (error) {
      console.error(`Error getting deployments for ${namespace}:`, error);
      return [];
    }
  }

  async deleteNamespace(namespace) {
    try {
      // Extract branch name from namespace (e.g., "feature-user-auth" -> "user-auth")
      const branchName = namespace.replace('feature-', '');
      
      // Delete the baseline fallback ingress if it exists
      try {
        await this.executeKubectl(`delete ingress feature-${branchName}-baseline-fallback -n default --ignore-not-found`);
        console.log(`Deleted baseline fallback ingress for ${branchName}`);
      } catch (e) {
        // Ignore errors - ingress may not exist
      }
      
      // Delete the feature namespace
      await this.executeKubectl(`delete namespace ${namespace}`);
      return { success: true, message: `Namespace ${namespace} deleted` };
    } catch (error) {
      throw new Error(`Failed to delete namespace: ${error.message}`);
    }
  }
}

module.exports = K8sDeployer;
