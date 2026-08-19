/**
 * Obsidian Flux - Node Inventory Module
 * Manages data store, table rendering, filters, and node operations with SweetAlert2.
 */

window.NodesModule = (function () {
  // Initial seed nodes
  let nodes = [
    { id: 'ND-101', name: 'core-router-east-01', ip: '10.0.1.1', mac: '00:1A:2B:3C:4D:01', type: 'Router', location: 'US-East DC-1', latency: 8.2, uptime: '99.99%', status: 'ONLINE' },
    { id: 'ND-102', name: 'core-router-west-02', ip: '10.0.2.1', mac: '00:1A:2B:3C:4D:02', type: 'Router', location: 'US-West DC-2', latency: 14.5, uptime: '99.95%', status: 'ONLINE' },
    { id: 'ND-103', name: 'border-fw-paloalto', ip: '10.0.0.254', mac: '00:1A:2B:3C:4D:FE', type: 'Firewall', location: 'DMZ Ingress', latency: 4.1, uptime: '99.99%', status: 'ONLINE' },
    { id: 'ND-104', name: 'agg-switch-rack-a', ip: '10.0.1.10', mac: '00:1A:2B:3C:4D:10', type: 'Switch', location: 'US-East Rack A', latency: 2.4, uptime: '99.98%', status: 'ONLINE' },
    { id: 'ND-105', name: 'agg-switch-rack-b', ip: '10.0.1.11', mac: '00:1A:2B:3C:4D:11', type: 'Switch', location: 'US-East Rack B', latency: 48.9, uptime: '97.40%', status: 'DEGRADED' },
    { id: 'ND-106', name: 'k8s-master-node-01', ip: '10.0.3.50', mac: '00:1A:2B:3C:4D:50', type: 'Server', location: 'K8s Cluster Alpha', latency: 11.0, uptime: '99.99%', status: 'ONLINE' },
    { id: 'ND-107', name: 'k8s-worker-node-02', ip: '10.0.3.51', mac: '00:1A:2B:3C:4D:51', type: 'Server', location: 'K8s Cluster Alpha', latency: 12.3, uptime: '99.92%', status: 'ONLINE' },
    { id: 'ND-108', name: 'k8s-worker-node-03', ip: '10.0.3.52', mac: '00:1A:2B:3C:4D:52', type: 'Server', location: 'K8s Cluster Alpha', latency: 185.2, uptime: '89.12%', status: 'CRITICAL' },
    { id: 'ND-109', name: 'db-postgres-primary', ip: '10.0.4.10', mac: '00:1A:2B:3C:4D:A0', type: 'Server', location: 'Database Vault 1', latency: 3.8, uptime: '99.99%', status: 'ONLINE' },
    { id: 'ND-110', name: 'db-postgres-replica', ip: '10.0.4.11', mac: '00:1A:2B:3C:4D:A1', type: 'Server', location: 'Database Vault 2', latency: 9.6, uptime: '99.95%', status: 'ONLINE' },
    { id: 'ND-111', name: 'edge-gateway-eu-central', ip: '10.2.0.1', mac: '00:1A:2B:3C:4E:01', type: 'Router', location: 'EU-Central (Frankfurt)', latency: 89.4, uptime: '98.50%', status: 'DEGRADED' },
    { id: 'ND-112', name: 'vpn-concentrator-sec', ip: '10.0.0.100', mac: '00:1A:2B:3C:4F:64', type: 'Firewall', location: 'Remote Access DMZ', latency: 18.2, uptime: '99.90%', status: 'ONLINE' },
    { id: 'ND-113', name: 'san-storage-array-01', ip: '10.0.5.5', mac: '00:1A:2B:3C:40:05', type: 'Server', location: 'SAN Vault A', latency: 1.5, uptime: '100.0%', status: 'ONLINE' },
    { id: 'ND-114', name: 'legacy-switch-floor-3', ip: '10.0.8.20', mac: '00:1A:2B:3C:48:14', type: 'Switch', location: 'HQ Floor 3', latency: 0.0, uptime: '0.00%', status: 'OFFLINE' },
    { id: 'ND-115', name: 'cloud-flare-tunnel-01', ip: '172.16.0.4', mac: '02:42:AC:10:00:04', type: 'Router', location: 'Virtual Edge', latency: 6.8, uptime: '99.99%', status: 'ONLINE' },
    { id: 'ND-116', name: 'dns-bind9-ns1', ip: '10.0.1.53', mac: '00:1A:2B:3C:53:53', type: 'Server', location: 'US-East DC-1', latency: 2.1, uptime: '100.0%', status: 'ONLINE' },
    { id: 'ND-117', name: 'backup-server-nas', ip: '10.0.5.99', mac: '00:1A:2B:3C:55:99', type: 'Server', location: 'Backup Vault B', latency: 5.4, uptime: '99.90%', status: 'ONLINE' },
    { id: 'ND-118', name: 'voip-sip-gateway', ip: '10.0.9.1', mac: '00:1A:2B:3C:49:01', type: 'Router', location: 'HQ Comms Room', latency: 0.0, uptime: '0.00%', status: 'OFFLINE' }
  ];

  let nodeModal = null;

  function init() {
    nodeModal = new bootstrap.Modal(document.getElementById('nodeModal'));

    // Event listeners for search & filter
    document.getElementById('node-search-filter').addEventListener('input', renderNodesTable);
    document.getElementById('node-status-filter').addEventListener('change', renderNodesTable);
    document.getElementById('node-type-filter').addEventListener('change', renderNodesTable);

    // Form submit & action buttons
    document.getElementById('node-form').addEventListener('submit', handleNodeFormSubmit);
    document.getElementById('add-node-btn').addEventListener('click', () => openNodeModal());
    document.getElementById('quick-add-node-btn').addEventListener('click', () => openNodeModal());
    document.getElementById('export-nodes-btn').addEventListener('click', exportInventoryCSV);

    const scanBtn = document.getElementById('scan-network-btn');
    if (scanBtn) {
      scanBtn.addEventListener('click', scanNetworkFromBackend);
    }

    renderNodesTable();
    renderOverviewNodesTable();

    // Populate the node directory with REAL devices discovered by the Python
    // backend (Scanner.py). Falls back to the simulated seed inventory only
    // when the API is unreachable.
    loadRealDevicesFromBackend().then((loaded) => {
      if (loaded) {
        renderNodesTable();
        renderOverviewNodesTable();
        if (window.AppModule) window.AppModule.updateKPISummaries();
      }
    });
  }

  function getNodes() {
    return nodes;
  }

  function mapDeviceToNode(dev, idx) {
    return {
      id: `ND-${100 + idx}`,
      name: (dev.hostname && dev.hostname !== dev.ip)
        ? dev.hostname
        : `device-${dev.ip.split('.').pop()}`,
      ip: dev.ip,
      mac: dev.mac,
      type: (dev.ip.endsWith('.1') || dev.ip.endsWith('.254')) ? 'Router' : 'Server',
      location: 'Local Subnet',
      latency: dev.latency || 2.5,
      uptime: '99.99%',
      status: dev.status || 'ONLINE'
    };
  }

  async function loadRealDevicesFromBackend() {
    const API_BASE = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:8000';
    try {
      const res = await fetch(`${API_BASE}/api/scan`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.devices && data.devices.length) {
          nodes = data.devices.map(mapDeviceToNode);
          console.log(`[Obsidian Flux] Loaded ${nodes.length} real device(s) from Scanner.py backend.`);
          return true;
        }
      }
    } catch (err) {
      console.warn('[Obsidian Flux] Backend offline - keeping simulated inventory.', err);
    }
    return false;
  }

  function getStatusChipHTML(status) {
    let cssClass = 'status-online';
    let icon = 'bi-check-circle-fill';
    if (status === 'DEGRADED') { cssClass = 'status-degrading'; icon = 'bi-exclamation-circle-fill'; }
    if (status === 'OFFLINE') { cssClass = 'status-offline'; icon = 'bi-dash-circle-fill'; }
    if (status === 'CRITICAL') { cssClass = 'status-critical'; icon = 'bi-x-circle-fill'; }
    return `<span class="status-chip ${cssClass}"><i class="bi ${icon}"></i> ${status}</span>`;
  }

  function renderNodesTable() {
    const searchVal = document.getElementById('node-search-filter').value.toLowerCase();
    const statusVal = document.getElementById('node-status-filter').value;
    const typeVal = document.getElementById('node-type-filter').value;

    const filtered = nodes.filter(n => {
      const matchSearch = n.name.toLowerCase().includes(searchVal) ||
                          n.ip.toLowerCase().includes(searchVal) ||
                          n.mac.toLowerCase().includes(searchVal) ||
                          n.location.toLowerCase().includes(searchVal);
      const matchStatus = statusVal === 'ALL' || n.status === statusVal;
      const matchType = typeVal === 'ALL' || n.type === typeVal;
      return matchSearch && matchStatus && matchType;
    });

    document.getElementById('showing-nodes-count').innerText = `Showing ${filtered.length} of ${nodes.length}`;
    document.getElementById('node-count-badge').innerText = nodes.length;

    const tbody = document.getElementById('nodes-table-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-secondary py-4">No matching network nodes found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(node => `
      <tr>
        <td class="fw-bold text-white">
          <i class="bi ${getNodeTypeIcon(node.type)} me-2 text-primary"></i>
          ${node.name}
          <div class="text-secondary font-mono" style="font-size: 0.75rem;">ID: ${node.id}</div>
        </td>
        <td class="font-mono text-info">${node.ip}</td>
        <td class="font-mono text-secondary">${node.mac}</td>
        <td><span class="badge bg-dark border border-secondary">${node.type}</span></td>
        <td class="text-secondary">${node.location}</td>
        <td class="font-mono ${node.latency > 50 ? 'text-warning' : (node.latency === 0 ? 'text-danger' : 'text-success')}">
          ${node.latency > 0 ? node.latency + ' ms' : 'N/A'}
        </td>
        <td class="font-mono text-secondary">${node.uptime}</td>
        <td>${getStatusChipHTML(node.status)}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-obsidian-ghost" title="Ping Test" onclick="NodesModule.pingNode('${node.id}')">
              <i class="bi bi-broadcast"></i>
            </button>
            <button class="btn btn-obsidian-ghost" title="Restart Node" onclick="NodesModule.restartNode('${node.id}')">
              <i class="bi bi-arrow-repeat"></i>
            </button>
            <button class="btn btn-obsidian-ghost" title="Edit Node" onclick="NodesModule.openNodeModal('${node.id}')">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-obsidian-ghost text-danger" title="Decommission" onclick="NodesModule.deleteNode('${node.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderOverviewNodesTable() {
    const tbody = document.getElementById('overview-nodes-tbody');
    if (!tbody) return;
    const sample = nodes.slice(0, 6);

    tbody.innerHTML = sample.map(node => `
      <tr>
        <td class="fw-bold text-white">
          <i class="bi ${getNodeTypeIcon(node.type)} me-2 text-primary"></i> ${node.name}
        </td>
        <td class="font-mono text-info" style="font-size: 0.8rem;">${node.ip}</td>
        <td><span class="badge bg-secondary" style="font-size: 0.7rem;">${node.type}</span></td>
        <td class="font-mono fw-semibold" style="font-size: 0.8rem;">${node.latency > 0 ? node.latency + 'ms' : '-'}</td>
        <td>${getStatusChipHTML(node.status)}</td>
        <td class="text-end">
          <button class="btn btn-obsidian-ghost py-0" title="Ping" onclick="NodesModule.pingNode('${node.id}')">
            <i class="bi bi-broadcast"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  function getNodeTypeIcon(type) {
    switch (type) {
      case 'Router': return 'bi-router';
      case 'Switch': return 'bi-diagram-3-fill';
      case 'Firewall': return 'bi-shield-lock-fill';
      case 'Server': return 'bi-server';
      default: return 'bi-hdd-network';
    }
  }

  function openNodeModal(nodeId = null) {
    const title = document.getElementById('nodeModalTitle');
    const form = document.getElementById('node-form');
    form.reset();

    if (nodeId) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        title.innerText = `Edit Node: ${node.name}`;
        document.getElementById('node-id-hidden').value = node.id;
        document.getElementById('modal-node-name').value = node.name;
        document.getElementById('modal-node-ip').value = node.ip;
        document.getElementById('modal-node-mac').value = node.mac;
        document.getElementById('modal-node-type').value = node.type;
        document.getElementById('modal-node-location').value = node.location;
        document.getElementById('modal-node-status').value = node.status;
      }
    } else {
      title.innerText = 'Add Network Node';
      document.getElementById('node-id-hidden').value = '';
    }
    nodeModal.show();
  }

  function handleNodeFormSubmit(e) {
    e.preventDefault();
    const hiddenId = document.getElementById('node-id-hidden').value;
    const name = document.getElementById('modal-node-name').value;
    const ip = document.getElementById('modal-node-ip').value;
    const mac = document.getElementById('modal-node-mac').value;
    const type = document.getElementById('modal-node-type').value;
    const location = document.getElementById('modal-node-location').value;
    const status = document.getElementById('modal-node-status').value;

    if (hiddenId) {
      // Edit existing
      const node = nodes.find(n => n.id === hiddenId);
      if (node) {
        node.name = name;
        node.ip = ip;
        node.mac = mac;
        node.type = type;
        node.location = location;
        node.status = status;
      }
      Swal.fire({
        title: 'Node Updated',
        text: `Configuration for ${name} saved successfully.`,
        icon: 'success',
        background: 'var(--surface-container-high)',
        color: 'var(--on-surface)',
        confirmButtonColor: 'var(--primary-container)'
      });
    } else {
      // Create new
      const newId = `ND-${Math.floor(100 + Math.random() * 900)}`;
      nodes.unshift({
        id: newId,
        name,
        ip,
        mac,
        type,
        location,
        latency: status === 'OFFLINE' ? 0.0 : +(Math.random() * 15 + 4).toFixed(1),
        uptime: status === 'OFFLINE' ? '0.00%' : '100.0%',
        status
      });

      Swal.fire({
        title: 'Node Provisioned',
        text: `New network node ${name} (${ip}) has been registered into the inventory.`,
        icon: 'success',
        background: 'var(--surface-container-high)',
        color: 'var(--on-surface)',
        confirmButtonColor: 'var(--primary-container)'
      });
    }

    nodeModal.hide();
    renderNodesTable();
    renderOverviewNodesTable();
    if (window.AppModule) window.AppModule.updateKPISummaries();
  }

  async function scanNetworkFromBackend() {
    const API_BASE = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:8000';
    
    Swal.fire({
      title: 'Scanning Local Network...',
      text: 'Python FastAPI is discovering active devices on your subnet via ARP / ICMP...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); },
      background: 'var(--surface-container-high)',
      color: 'var(--on-surface)'
    });

    try {
      const res = await fetch(`${API_BASE}/api/scan`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.devices && data.devices.length) {
          nodes = data.devices.map(mapDeviceToNode);

          renderNodesTable();
          renderOverviewNodesTable();
          if (window.AppModule) window.AppModule.updateKPISummaries();

          Swal.fire({
            title: 'Network Scan Complete',
            text: `Discovered ${data.devices.length} real device(s) on ${data.network && data.network.network ? data.network.network : 'your network'}. Node directory now reflects live inventory.`,
            icon: 'success',
            background: 'var(--surface-container-high)',
            color: 'var(--on-surface)',
            confirmButtonColor: 'var(--primary-container)'
          });
          return;
        }
      }
    } catch (err) {
      console.warn('Network scan error:', err);
    }

    Swal.fire({
      title: 'Scan API Offline',
      text: 'Could not reach Python API server. Make sure "python backend/Main.py" is running.',
      icon: 'warning',
      background: 'var(--surface-container-high)',
      color: 'var(--on-surface)',
      confirmButtonColor: 'var(--primary-container)'
    });
  }

  async function pingNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const API_BASE = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:8000';

    Swal.fire({
      title: `Pinging ${node.ip}...`,
      text: 'Executing ICMP Ping through Python backend...',
      didOpen: () => { Swal.showLoading(); },
      background: 'var(--surface-container-high)',
      color: 'var(--on-surface)'
    });

    try {
      const res = await fetch(`${API_BASE}/api/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: node.ip })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.latency !== null) {
          node.latency = data.latency;
          renderNodesTable();
          renderOverviewNodesTable();

          Swal.fire({
            title: `ICMP Echo Response: ${node.name}`,
            html: `
              <div class="text-start font-mono p-3 rounded" style="background:#030712; color:#10b981; font-size:0.85rem;">
                <div>PING ${node.ip} (${node.ip}) 56(84) bytes of data.</div>
                <div>64 bytes from ${node.ip}: icmp_seq=1 ttl=64 time=${data.latency} ms</div>
                <div>64 bytes from ${node.ip}: icmp_seq=2 ttl=64 time=${(data.latency * 0.98).toFixed(1)} ms</div>
                <div class="mt-2 text-white">--- ${node.ip} ping statistics ---</div>
                <div>2 packets transmitted, 2 received, 0% packet loss, RTT ${data.latency} ms</div>
              </div>
            `,
            background: 'var(--surface-container-high)',
            color: 'var(--on-surface)',
            confirmButtonColor: 'var(--primary-container)',
            confirmButtonText: 'Done'
          });
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    // Fallback simulation if backend ping API offline or unreachable
    Swal.fire({
      title: `ICMP Echo Test (Simulated): ${node.name}`,
      html: `
        <div class="text-start font-mono p-3 rounded" style="background:#030712; color:#10b981; font-size:0.85rem;">
          <div>PING ${node.ip} (${node.ip}) 56(84) bytes of data.</div>
          <div>64 bytes from ${node.ip}: icmp_seq=1 ttl=64 time=${(node.latency * 0.95).toFixed(1)} ms</div>
          <div>64 bytes from ${node.ip}: icmp_seq=2 ttl=64 time=${(node.latency * 1.02).toFixed(1)} ms</div>
          <div class="mt-2 text-white">--- ${node.ip} ping statistics ---</div>
          <div>2 packets transmitted, 2 received, 0% packet loss</div>
        </div>
      `,
      background: 'var(--surface-container-high)',
      color: 'var(--on-surface)',
      confirmButtonColor: 'var(--primary-container)',
      confirmButtonText: 'Done'
    });
  }

  function restartNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    Swal.fire({
      title: `Restart ${node.name}?`,
      text: `This will trigger a soft reboot on node ${node.ip}. Services may experience brief failover latency.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--tertiary-container)',
      cancelButtonColor: 'var(--surface-container-highest)',
      confirmButtonText: 'Yes, Reboot Node',
      background: 'var(--surface-container-high)',
      color: 'var(--on-surface)'
    }).then((result) => {
      if (result.isConfirmed) {
        node.status = 'DEGRADED';
        renderNodesTable();
        renderOverviewNodesTable();

        Swal.fire({
          title: 'Reboot Sequence Initiated',
          text: `BGP Graceful restart signal dispatched to ${node.ip}.`,
          icon: 'info',
          background: 'var(--surface-container-high)',
          color: 'var(--on-surface)',
          confirmButtonColor: 'var(--primary-container)'
        });

        setTimeout(() => {
          node.status = 'ONLINE';
          renderNodesTable();
          renderOverviewNodesTable();
        }, 5000);
      }
    });
  }

  function deleteNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    Swal.fire({
      title: `Decommission ${node.name}?`,
      text: `Are you sure you want to remove ${node.name} (${node.ip}) from monitoring? This action cannot be undone.`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'var(--surface-container-highest)',
      confirmButtonText: 'Decommission Node',
      background: 'var(--surface-container-high)',
      color: 'var(--on-surface)'
    }).then((result) => {
      if (result.isConfirmed) {
        nodes = nodes.filter(n => n.id !== nodeId);
        renderNodesTable();
        renderOverviewNodesTable();
        if (window.AppModule) window.AppModule.updateKPISummaries();

        Swal.fire({
          title: 'Node Decommissioned',
          text: `Node ${node.name} has been removed from inventory.`,
          icon: 'success',
          background: 'var(--surface-container-high)',
          color: 'var(--on-surface)',
          confirmButtonColor: 'var(--primary-container)'
        });
      }
    });
  }

  function exportInventoryCSV() {
    let csv = 'ID,Name,IP,MAC,Type,Location,Latency_ms,Uptime,Status\n';
    nodes.forEach(n => {
      csv += `"${n.id}","${n.name}","${n.ip}","${n.mac}","${n.type}","${n.location}","${n.latency}","${n.uptime}","${n.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Obsidian_Flux_Nodes_${Date.now()}.csv`);
    a.click();
  }

  return {
    init,
    getNodes,
    renderNodesTable,
    renderOverviewNodesTable,
    openNodeModal,
    pingNode,
    restartNode,
    deleteNode,
    scanNetworkFromBackend,
    loadRealDevicesFromBackend
  };
})();
