/**
 * Obsidian Flux - Application Main Coordinator
 * Handles routing, real-time live telemetry simulation, theme switching, and global events.
 */

window.AppModule = (function () {
  let isLiveStreaming = true;
  let liveTimer = null;
  let currentTheme = 'dark';

  function init() {
    // 1. Initialize modules
    if (window.NodesModule) window.NodesModule.init();
    if (window.AlertsModule) window.AlertsModule.init();
    if (window.ChartsModule) window.ChartsModule.init();
    if (window.DiagnosticsModule) window.DiagnosticsModule.init();

    // 2. Navigation listener
    setupNavigation();

    // 3. Theme toggle setup
    setupThemeToggle();

    // 4. Live telemetry loop
    setupLiveStreamToggle();

    // 5. System Clock
    setInterval(updateSystemClock, 1000);
    updateSystemClock();

    // 6. Global Search
    setupGlobalSearch();

    // 7. Settings sliders listeners
    setupSettingsListeners();

    // 8. Force Refresh button
    const refreshBtn = document.getElementById('refresh-telemetry-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', forceRefreshTelemetry);
    }

    // Mobile sidebar toggle
    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        document.getElementById('main-sidebar').classList.toggle('show-sidebar');
      });
    }

    // Start live simulation loop
    startLiveSimulation();

    updateKPISummaries();
  }

  function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar .nav-link, [data-view-trigger]');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetViewId = link.getAttribute('data-view') || link.getAttribute('data-view-trigger');
        if (!targetViewId) return;

        // Update active nav link
        document.querySelectorAll('.sidebar .nav-link').forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`.sidebar .nav-link[data-view="${targetViewId}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Hide all views & show target
        document.querySelectorAll('.view-section').forEach(sec => {
          sec.classList.add('d-none');
          sec.classList.remove('active');
        });

        const targetView = document.getElementById(targetViewId);
        if (targetView) {
          targetView.classList.remove('d-none');
          targetView.classList.add('active');
        }

        // Hide mobile sidebar if open
        document.getElementById('main-sidebar').classList.remove('show-sidebar');
      });
    });
  }

  function setupThemeToggle() {
    const savedTheme = localStorage.getItem('obsidian-theme') || 'dark';
    setTheme(savedTheme);

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
      });
    }
  }

  function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('obsidian-theme', theme);

    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      if (theme === 'light') {
        themeIcon.className = 'bi bi-sun-fill text-warning';
      } else {
        themeIcon.className = 'bi bi-moon-stars-fill';
      }
    }

    if (window.ChartsModule) {
      window.ChartsModule.updateChartColors();
    }
  }

  function setupLiveStreamToggle() {
    const liveToggle = document.getElementById('live-stream-toggle');
    if (!liveToggle) return;

    liveToggle.addEventListener('click', () => {
      isLiveStreaming = !isLiveStreaming;
      const text = document.getElementById('live-stream-text');
      const dot = document.getElementById('live-pulse-dot');

      if (isLiveStreaming) {
        text.innerText = 'LIVE DATA STREAM';
        liveToggle.style.opacity = '1';
        dot.style.display = 'inline-block';
        startLiveSimulation();
        Swal.fire({
          title: 'Live Stream Resumed',
          text: 'Telemetry feeds updated in real-time.',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          background: 'var(--surface-container-high)',
          color: 'var(--on-surface)'
        });
      } else {
        text.innerText = 'STREAM PAUSED';
        liveToggle.style.opacity = '0.6';
        dot.style.display = 'none';
        stopLiveSimulation();
        Swal.fire({
          title: 'Live Stream Paused',
          text: 'Telemetry feeds frozen.',
          icon: 'info',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          background: 'var(--surface-container-high)',
          color: 'var(--on-surface)'
        });
      }
    });
  }

  function startLiveSimulation() {
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = setInterval(() => {
      if (!isLiveStreaming) return;

      // Random micro-fluctuations in throughput (12.0 ~ 16.0 Gbps)
      const ingress = +(10 + Math.random() * 4).toFixed(1);
      const egress = +(6 + Math.random() * 3).toFixed(1);
      const latency = +(16 + Math.random() * 5).toFixed(1);

      document.getElementById('kpi-bandwidth').innerText = `${(ingress + egress).toFixed(1)} Gbps`;
      document.getElementById('kpi-latency').innerText = `${latency} ms`;

      // Resource progress bar variations
      const cpu = +(70 + Math.random() * 15).toFixed(1);
      const ram = +(60 + Math.random() * 5).toFixed(1);
      const loss = +(1.0 + Math.random() * 1.5).toFixed(1);

      document.getElementById('res-cpu-val').innerText = `${cpu}%`;
      document.getElementById('res-cpu-bar').style.width = `${cpu}%`;

      document.getElementById('res-ram-val').innerText = `${ram}%`;
      document.getElementById('res-ram-bar').style.width = `${ram}%`;

      document.getElementById('res-loss-val').innerText = `${loss}%`;
      document.getElementById('res-loss-bar').style.width = `${loss * 10}%`;

      // Push point to Chart.js
      if (window.ChartsModule) {
        window.ChartsModule.pushRealtimeDataPoint(ingress, egress, latency);
      }

    }, 3000);
  }

  function stopLiveSimulation() {
    if (liveTimer) clearInterval(liveTimer);
  }

  function updateSystemClock() {
    const clockEl = document.getElementById('system-clock');
    if (!clockEl) return;
    const now = new Date();
    const utcStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    clockEl.innerText = utcStr;
  }

  function updateKPISummaries() {
    if (!window.NodesModule) return;
    const nodes = window.NodesModule.getNodes();
    const online = nodes.filter(n => n.status === 'ONLINE').length;
    const total = nodes.length;

    document.getElementById('kpi-active-nodes').innerText = `${online} / ${total}`;
    
    if (window.AlertsModule) {
      const alerts = window.AlertsModule.getAlerts();
      const critCount = alerts.filter(a => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
      document.getElementById('kpi-alerts').innerText = `${critCount} Critical`;
    }
  }

  function forceRefreshTelemetry() {
    Swal.fire({
      title: 'Refreshing Telemetry Feeds',
      text: 'Querying edge routers and SNMP agents...',
      icon: 'info',
      timer: 1000,
      showConfirmButton: false,
      background: 'var(--surface-container-high)',
      color: 'var(--on-surface)'
    });
    if (window.NodesModule) {
      window.NodesModule.renderNodesTable();
      window.NodesModule.renderOverviewNodesTable();
    }
    updateKPISummaries();
  }

  function setupGlobalSearch() {
    const searchInput = document.getElementById('global-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (!query) return;

        // Switch to Nodes Directory view and pre-fill search filter
        const navNodes = document.getElementById('nav-nodes');
        if (navNodes) navNodes.click();

        const nodeSearchFilter = document.getElementById('node-search-filter');
        if (nodeSearchFilter) {
          nodeSearchFilter.value = query;
          if (window.NodesModule) window.NodesModule.renderNodesTable();
        }
      }
    });
  }

  function setupSettingsListeners() {
    const latencySlider = document.getElementById('setting-latency-threshold');
    if (latencySlider) {
      latencySlider.addEventListener('input', (e) => {
        document.getElementById('val-latency').innerText = `${e.target.value} ms`;
      });
    }

    const cpuSlider = document.getElementById('setting-cpu-threshold');
    if (cpuSlider) {
      cpuSlider.addEventListener('input', (e) => {
        document.getElementById('val-cpu').innerText = `${e.target.value}%`;
      });
    }

    const lossSlider = document.getElementById('setting-packet-loss');
    if (lossSlider) {
      lossSlider.addEventListener('input', (e) => {
        document.getElementById('val-loss').innerText = `${e.target.value}%`;
      });
    }

    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        Swal.fire({
          title: 'Settings Saved',
          text: 'Threshold alert triggers and security automation rules updated.',
          icon: 'success',
          background: 'var(--surface-container-high)',
          color: 'var(--on-surface)',
          confirmButtonColor: 'var(--primary-container)'
        });
      });
    }
  }

  return {
    init,
    updateKPISummaries
  };
})();

// Bootstrap Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.AppModule.init();
});
