const http = require('http');
const port = process.env.PORT || 3001;
const serviceName = process.env.SERVICE_NAME || 'api';
const namespace = process.env.NAMESPACE || 'default';
const branchName = process.env.BRANCH_NAME || 'baseline';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: serviceName,
    namespace: namespace,
    branch: branchName,
    version: branchName,
    timestamp: new Date().toISOString(),
    path: req.url,
    endpoints: ['/health', '/data'],
    message: `API service running in namespace ${namespace} for branch ${branchName}`
  }, null, 2));
});

server.listen(port, () => {
  console.log(`${serviceName} server running on port ${port} in namespace ${namespace} (branch: ${branchName})`);
});
