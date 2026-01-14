const express = require('express');
const cors = require('cors');
const path = require('path');
const K8sDeployer = require('./deployer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const deployer = new K8sDeployer();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Deploy services to feature namespace
app.post('/api/deploy', async (req, res) => {
  try {
    const { branchName, services } = req.body;

    if (!branchName || !branchName.trim()) {
      return res.status(400).json({ error: 'Branch name is required' });
    }

    if (!services || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ error: 'At least one service must be selected' });
    }

    // Validate service names
    const validServices = ['frontend', 'backend', 'api'];
    const invalidServices = services.filter(s => !validServices.includes(s));
    if (invalidServices.length > 0) {
      return res.status(400).json({ error: `Invalid services: ${invalidServices.join(', ')}` });
    }

    // Sanitize branch name (alphanumeric and hyphens only)
    const sanitizedBranch = branchName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    const result = await deployer.deploy(sanitizedBranch, services);
    res.json(result);
  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all feature namespaces
app.get('/api/namespaces', async (req, res) => {
  try {
    const namespaces = await deployer.listNamespaces();
    res.json(namespaces);
  } catch (error) {
    console.error('Error listing namespaces:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get services in a namespace
app.get('/api/services/:namespace', async (req, res) => {
  try {
    const { namespace } = req.params;
    const services = await deployer.getServices(namespace);
    const deployments = await deployer.getDeployments(namespace);
    
    res.json({
      namespace,
      services,
      deployments
    });
  } catch (error) {
    console.error('Error getting services:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a namespace
app.delete('/api/namespace/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const result = await deployer.deleteNamespace(name);
    res.json(result);
  } catch (error) {
    console.error('Error deleting namespace:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Deployment Portal running on http://localhost:${PORT}`);
  console.log(`📦 Kubernetes cluster: ${process.env.KUBECONFIG || 'default'}`);
});
