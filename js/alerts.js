/**
 * Obsidian Flux - Incident & Alert Log Module
 * Manages security event feed, severity filtering, and response mitigation dialogs.
 */

window.AlertsModule = (function () {
  let alerts = [
    {
      id: 'ALT-8902',
      timestamp: 'Just Now',
      severity: 'CRITICAL',
      title: 'BGP Flap & Packet Loss Spikes on Core Router',
      source: 'core-router-west-02 (10.0.2.1)',
      description: 'Peer session 192.0.2.1 dropped 4 times within 60s. Latency increased by +145ms with 18% packet drop.',
      status: 'UNACKNOWLEDGED'
    },
    {
      id: 'ALT-8899',
      timestamp: '12 mins ago',
      severity: 'CRITICAL',
      title: 'High Latency & Resource Saturation',
      source: 'k8s-worker-node-03 (10.0.3.52)',
      description: 'CPU saturation hit 98.4% threshold. Memory swap active with pending pod evictions.',
      status: 'UNACKNOWLEDGED'
    },
    {
      id: 'ALT-8895',
      timestamp: '28 mins ago',
      severity: 'WARNING',
      title: 'Port Saturation on Aggregation Switch',
      source: 'agg-switch-rack-b (10.0.1.11)',
      description: 'Interface eth0/4 ingress utilization at 92% bandwidth capacity (9.2 Gbps).',
      status: 'UNACKNOWLEDGED'
    },
    {
      id: 'ALT-8880',
      timestamp: '1 hour ago',
      severity: 'WARNING',
      title: 'BGP Route Degradation',
      source: 'edge-gateway-eu-central (10.2.0.1)',
      description: 'Round-trip delay breached 85ms threshold on Frankfurt cross-connect.',
      status: 'UNACKNOWLEDGED'
    },
    {
      id: 'ALT-8862',
      timestamp: '3 hours ago',
      severity: 'INFO',
      title: 'Automated TLS Certificate Renewal',
      source: 'border-fw-paloalto (10.0.0.254)',
      description: 'Let\'s Encrypt SAN certificate updated successfully for *.obsidianflux.net.',
      status: 'RESOLVED'
    },
    {
      id: 'ALT-8840',
      timestamp: '5 hours ago',
      severity: 'RESOLVED',
      title: 'SQL Database Replica Sync Lag Mitigated',
      source: 'db-postgres-replica (10.0.4.11)',
      description: 'Replication lag cleared. WAL stream resumed at 0ms delay.',
      status: 'RESOLVED'
    }
  ];

  let currentFilter = 'ALL';

  function init() {
    // Filter button listeners
    document.querySelectorAll('.alert-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.alert-filter-btn').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        currentFilter = target.getAttribute('data-severity');
        renderAlertsFeed();
      });
    });

    document.getElementById('clear-resolved-alerts-btn').addEventListener('click', clearResolvedAlerts);

    renderAlertsFeed();
  }

  function getAlerts() {
    return alerts;
  }

  function renderAlertsFeed() {
    const container = document.getElementById('alerts-feed-container');
    if (!container) return;

    const filtered = alerts.filter(a => {
      if (currentFilter === 'ALL') return true;
      if (currentFilter === 'RESOLVED') return a.status === 'RESOLVED';
      return a.severity === currentFilter && a.status !== 'RESOLVED';
    });

    document.getElementById('alert-count-badge').innerText = alerts.filter(a => a.status === 'UNACKNOWLEDGED' && a.severity === 'CRITICAL').length;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="obsidian-card p-5 text-center text-secondary">
          <i class="bi bi-shield-check display-4 text-success mb-3 d-block"></i>
          <h5>No Alerts Matching Filter</h5>
          <p class="m-0" style="font-size:0.85rem;">All systems operating within defined operational thresholds.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(alert => `
      <div class="obsidian-card m-0 p-3" style="border-left: 4px solid ${getSeverityBorderColor(alert.severity, alert.status)};">
        <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
          <div class="d-flex align-items-center gap-2">
            ${getSeverityBadge(alert.severity, alert.status)}
            <span class="font-mono text-secondary" style="font-size:0.75rem;">${alert.id}</span>
            <span class="text-secondary">•</span>
            <span class="font-mono text-info" style="font-size:0.8rem;">${alert.source}</span>
          </div>
          <div class="text-secondary font-mono" style="font-size:0.75rem;">
            <i class="bi bi-clock"></i> ${alert.timestamp}
          </div>
        </div>

        <h5 class="fw-bold mb-1 text-white" style="font-size: 1rem;">${alert.title}</h5>
        <p class="text-secondary mb-3" style="font-size:0.875rem;">${alert.description}</p>

        <div class="d-flex align-items-center justify-content-between">
          <div>
            ${alert.status === 'RESOLVED' 
              ? `<span class="text-success font-mono" style="font-size:0.8rem;"><i class="bi bi-check-all"></i> Resolved</span>`
              : (alert.status === 'ACKNOWLEDGED'
                ? `<span class="text-info font-mono" style="font-size:0.8rem;"><i class="bi bi-eye-fill"></i> Acknowledged by SecOps</span>`
                : `<span class="text-warning font-mono" style="font-size:0.8rem;"><i class="bi bi-exclamation-diamond"></i> Requires Immediate Review</span>`)}
          </div>

          <div class="btn-group btn-group-sm">
            ${alert.status === 'UNACKNOWLEDGED' ? `
              <button class="btn btn-obsidian-secondary" onclick="AlertsModule.acknowledgeAlert('${alert.id}')">
                <i class="bi bi-check2-circle"></i> Acknowledge
              </button>
            ` : ''}
            
            ${alert.severity === 'CRITICAL' && alert.status !== 'RESOLVED' ? `
              <button class="btn btn-obsidian-secondary text-danger" onclick="AlertsModule.isolateHost('${alert.id}')">
                <i class="bi bi-slash-circle-fill"></i> Isolate Host
              </button>
            ` : ''}

            ${alert.status !== 'RESOLVED' ? `
              <button class="btn btn-obsidian-primary" onclick="AlertsModule.resolveAlert('${alert.id}')">
                <i class="bi bi-check-lg"></i> Mark Resolved
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  function getSeverityBadge(severity, status) {
    if (status === 'RESOLVED') {
      return `<span class="badge bg-success">RESOLVED</span>`;
    }
    switch (severity) {
      case 'CRITICAL': return `<span class="badge bg-danger"><i class="bi bi-exclamation-triangle-fill me-1"></i> CRITICAL</span>`;
      case 'WARNING': return `<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-circle me-1"></i> WARNING</span>`;
      case 'INFO': return `<span class="badge bg-info text-dark"><i class="bi bi-info-circle me-1"></i> INFO</span>`;
      default: return `<span class="badge bg-secondary">NOTICE</span>`;
    }
  }

  function getSeverityBorderColor(severity, status) {
    if (status === 'RESOLVED') return 'var(--success)';
    switch (severity) {
      case 'CRITICAL': return '#ef4444';
      case 'WARNING': return '#f59e0b';
      case 'INFO': return '#3b82f6';
      default: return 'var(--outline)';
    }
  }

  function acknowledgeAlert(alertId) {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'ACKNOWLEDGED';
      renderAlertsFeed();

      Swal.fire({
        title: 'Alert Acknowledged',
        text: `Incident ${alert.id} assigned to logged-in engineer.`,
        icon: 'info',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        background: 'var(--surface-container-high)',
        color: 'var(--on-surface)'
      });
    }
  }

  function isolateHost(alertId) {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;

    Swal.fire({
      title: `Emergency Host Isolation?`,
      html: `
        <p class="text-start">Are you sure you want to isolate host <b>${alert.source}</b> from the network fabric?</p>
        <div class="alert alert-danger text-start py-2" style="font-size:0.8rem;">
          <i class="bi bi-shield-exclamation me-1"></i> This will immediately block switch port VLAN trunks and apply firewall DROP rules.
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'var(--surface-container-highest)',
      confirmButtonText: 'Yes, Enforce Isolation',
      background: 'var(--surface-container-high)',
      color: 'var(--on-surface)'
    }).then((result) => {
      if (result.isConfirmed) {
        alert.status = 'RESOLVED';
        alert.title += ' (HOST ISOLATED)';
        renderAlertsFeed();

        Swal.fire({
          title: 'Isolation Enforced',
          text: `Host ${alert.source} port disabled. VLAN quarantined.`,
          icon: 'success',
          background: 'var(--surface-container-high)',
          color: 'var(--on-surface)',
          confirmButtonColor: 'var(--primary-container)'
        });
      }
    });
  }

  function resolveAlert(alertId) {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'RESOLVED';
      renderAlertsFeed();

      Swal.fire({
        title: 'Incident Resolved',
        text: `Alert ${alert.id} closed. Log archived to audit trail.`,
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        background: 'var(--surface-container-high)',
        color: 'var(--on-surface)'
      });
    }
  }

  function clearResolvedAlerts() {
    alerts = alerts.filter(a => a.status !== 'RESOLVED');
    renderAlertsFeed();
  }

  function addAlert(newAlert) {
    alerts.unshift(newAlert);
    renderAlertsFeed();
  }

  return {
    init,
    getAlerts,
    renderAlertsFeed,
    acknowledgeAlert,
    isolateHost,
    resolveAlert,
    clearResolvedAlerts,
    addAlert
  };
})();
