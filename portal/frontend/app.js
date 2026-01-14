const API_BASE = window.location.origin;

// DOM elements
const deployForm = document.getElementById('deployForm');
const deployBtn = document.getElementById('deployBtn');
const deployStatus = document.getElementById('deployStatus');
const refreshBtn = document.getElementById('refreshBtn');
const namespacesList = document.getElementById('namespacesList');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadNamespaces();
    
    deployForm.addEventListener('submit', handleDeploy);
    refreshBtn.addEventListener('click', loadNamespaces);
    
    // Auto-refresh every 10 seconds
    setInterval(loadNamespaces, 10000);
});

async function handleDeploy(e) {
    e.preventDefault();
    
    const branchName = document.getElementById('branchName').value.trim();
    const serviceCheckboxes = document.querySelectorAll('input[name="services"]:checked');
    const services = Array.from(serviceCheckboxes).map(cb => cb.value);
    
    if (services.length === 0) {
        showStatus('Please select at least one service', 'error');
        return;
    }
    
    deployBtn.disabled = true;
    deployBtn.textContent = 'Deploying...';
    showStatus('Deploying services...', 'success');
    
    try {
        const response = await fetch(`${API_BASE}/api/deploy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                branchName,
                services
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showStatus(
                `✅ Successfully deployed to namespace: ${data.namespace}<br>` +
                `🌐 Access at: http://${data.hostname}`,
                'success'
            );
            deployForm.reset();
            // Re-check all services
            document.querySelectorAll('input[name="services"]').forEach(cb => cb.checked = true);
            loadNamespaces();
        } else {
            showStatus(`❌ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ Deployment failed: ${error.message}`, 'error');
    } finally {
        deployBtn.disabled = false;
        deployBtn.textContent = 'Deploy to Feature Namespace';
    }
}

async function loadNamespaces() {
    try {
        const response = await fetch(`${API_BASE}/api/namespaces`);
        const namespaces = await response.json();
        
        if (namespaces.length === 0) {
            namespacesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <p>No feature namespaces deployed yet</p>
                    <p style="margin-top: 10px; font-size: 0.9em; color: #aaa;">
                        Deploy a feature branch to get started
                    </p>
                </div>
            `;
            return;
        }
        
        // Load details for each namespace
        const namespaceDetails = await Promise.all(
            namespaces.map(async (ns) => {
                try {
                    const servicesResponse = await fetch(`${API_BASE}/api/services/${ns.name}`);
                    const servicesData = await servicesResponse.json();
                    return { ...ns, ...servicesData };
                } catch (error) {
                    console.error(`Error loading details for ${ns.name}:`, error);
                    return { ...ns, services: [], deployments: [] };
                }
            })
        );
        
        renderNamespaces(namespaceDetails);
    } catch (error) {
        console.error('Error loading namespaces:', error);
        namespacesList.innerHTML = `
            <div class="status-message error">
                ❌ Error loading namespaces: ${error.message}
            </div>
        `;
    }
}

function renderNamespaces(namespaces) {
    namespacesList.innerHTML = namespaces.map(ns => {
        const branch = ns.branch || ns.name.replace('feature-', '');
        const hostname = `feature-${branch}.local`;
        
        const deploymentsHtml = ns.deployments && ns.deployments.length > 0
            ? ns.deployments.map(dep => `
                <div class="deployment-item">
                    <span class="deployment-name">${dep.name}</span>
                    <span class="deployment-status ${dep.readyReplicas === dep.replicas ? 'ready' : 'pending'}">
                        ${dep.readyReplicas}/${dep.replicas} ready
                    </span>
                </div>
            `).join('')
            : '<p style="color: #888; font-size: 0.9em;">No deployments</p>';
        
        return `
            <div class="namespace-card">
                <div class="namespace-header">
                    <div>
                        <div class="namespace-name">${ns.name}</div>
                    </div>
                    <span class="namespace-branch">${branch}</span>
                </div>
                <div class="namespace-info">
                    <div class="info-item">
                        <span class="info-label">Hostname</span>
                        <span class="info-value">${hostname}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Services</span>
                        <span class="info-value">${ns.services?.length || 0}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Deployments</span>
                        <span class="info-value">${ns.deployments?.length || 0}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Created</span>
                        <span class="info-value">${formatDate(ns.created)}</span>
                    </div>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong style="font-size: 0.9em; color: #555;">Deployments:</strong>
                    <div style="margin-top: 10px;">
                        ${deploymentsHtml}
                    </div>
                </div>
                <div class="namespace-actions">
                    <a href="http://${hostname}" target="_blank" class="btn btn-primary" style="text-decoration: none; display: inline-block;">
                        🌐 Open Service
                    </a>
                    <button class="btn btn-danger" onclick="deleteNamespace('${ns.name}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteNamespace(namespace) {
    if (!confirm(`Are you sure you want to delete namespace "${namespace}"? This will remove all services in this namespace.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/namespace/${namespace}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showStatus(`✅ ${data.message}`, 'success');
            loadNamespaces();
        } else {
            showStatus(`❌ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ Delete failed: ${error.message}`, 'error');
    }
}

function showStatus(message, type) {
    deployStatus.innerHTML = message;
    deployStatus.className = `status-message ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            deployStatus.style.display = 'none';
        }, 10000);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Make deleteNamespace available globally
window.deleteNamespace = deleteNamespace;
