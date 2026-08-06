/**
 * Obsidian Flux - Telemetry Charts Module
 * Configures Chart.js visualizations utilizing exact Obsidian Flux categorical color tokens.
 */

window.ChartsModule = (function () {
  let overviewBandwidthChart = null;
  let overviewStatusDoughnutChart = null;
  let telemetryIngressEgressChart = null;
  let telemetryProtocolChart = null;
  let telemetryLatencyChart = null;
  let telemetryTopHogsChart = null;

  // Time labels
  const timeLabels = ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45', '10:50', '10:55'];

  function init() {
    initOverviewCharts();
    initTelemetryCharts();
  }

  function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      textColor: isDark ? '#dae2fd' : '#0f172a',
      gridColor: isDark ? 'rgba(67, 70, 85, 0.25)' : 'rgba(148, 163, 184, 0.25)',
      blue: '#3b82f6',
      teal: '#14b8a6',
      purple: '#8b5cf6',
      amber: '#f59e0b',
      red: '#ef4444',
      green: '#10b981'
    };
  }

  function initOverviewCharts() {
    const colors = getThemeColors();

    // 1. Overview Bandwidth Chart
    const ctxBandwidth = document.getElementById('overviewBandwidthChart');
    if (ctxBandwidth) {
      const gradientIn = ctxBandwidth.getContext('2d').createLinearGradient(0, 0, 0, 280);
      gradientIn.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
      gradientIn.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

      const gradientOut = ctxBandwidth.getContext('2d').createLinearGradient(0, 0, 0, 280);
      gradientOut.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
      gradientOut.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

      overviewBandwidthChart = new Chart(ctxBandwidth, {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'Ingress (Gbps)',
              data: [6.2, 7.1, 8.4, 7.9, 9.2, 8.8, 10.5, 11.2, 9.8, 10.1, 11.8, 12.4],
              borderColor: colors.blue,
              backgroundColor: gradientIn,
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 3
            },
            {
              label: 'Egress (Gbps)',
              data: [4.1, 4.8, 5.2, 4.9, 6.1, 5.7, 6.8, 7.2, 6.5, 6.9, 7.5, 8.1],
              borderColor: colors.purple,
              backgroundColor: gradientOut,
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: colors.textColor, font: { family: 'Inter', size: 12 } }
            }
          },
          scales: {
            x: {
              grid: { color: colors.gridColor },
              ticks: { color: colors.textColor, font: { family: 'JetBrains Mono', size: 11 } }
            },
            y: {
              grid: { color: colors.gridColor },
              ticks: { color: colors.textColor, font: { family: 'JetBrains Mono', size: 11 } }
            }
          }
        }
      });
    }

    // 2. Overview Status Doughnut Chart
    const ctxStatus = document.getElementById('overviewStatusDoughnutChart');
    if (ctxStatus) {
      overviewStatusDoughnutChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: ['Online', 'Degraded', 'Offline'],
          datasets: [{
            data: [14, 2, 2],
            backgroundColor: [colors.green, colors.amber, colors.red],
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: { display: false }
          }
        }
      });
    }
  }

  function initTelemetryCharts() {
    const colors = getThemeColors();

    // 3. Telemetry Ingress / Egress Line Chart
    const ctxTele = document.getElementById('telemetryIngressEgressChart');
    if (ctxTele) {
      telemetryIngressEgressChart = new Chart(ctxTele, {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [
            {
              label: 'WAN Ingress (Gbps)',
              data: [12.1, 13.4, 11.9, 14.2, 15.8, 16.1, 14.8, 17.2, 18.0, 16.5, 19.1, 20.4],
              borderColor: colors.teal,
              tension: 0.3,
              borderWidth: 2
            },
            {
              label: 'LAN Egress (Gbps)',
              data: [8.5, 9.1, 8.2, 10.0, 11.2, 12.0, 10.9, 12.5, 13.1, 12.0, 14.2, 15.0],
              borderColor: colors.blue,
              tension: 0.3,
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: colors.textColor, font: { family: 'Inter', size: 12 } } }
          },
          scales: {
            x: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor, font: { family: 'JetBrains Mono' } } },
            y: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor, font: { family: 'JetBrains Mono' } } }
          }
        }
      });
    }

    // 4. Protocol Distribution
    const ctxProto = document.getElementById('telemetryProtocolChart');
    if (ctxProto) {
      telemetryProtocolChart = new Chart(ctxProto, {
        type: 'doughnut',
        data: {
          labels: ['HTTPS (443)', 'TCP Custom', 'UDP Stream', 'ICMP Echo', 'DNS (53)'],
          datasets: [{
            data: [45, 25, 18, 7, 5],
            backgroundColor: [colors.blue, colors.teal, colors.purple, colors.amber, colors.red],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: colors.textColor, font: { family: 'Inter', size: 11 } } }
          }
        }
      });
    }

    // 5. Latency Trend Chart
    const ctxLat = document.getElementById('telemetryLatencyChart');
    if (ctxLat) {
      telemetryLatencyChart = new Chart(ctxLat, {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [{
            label: 'Avg Echo Latency (ms)',
            data: [12.4, 13.1, 14.0, 12.8, 28.5, 48.9, 32.1, 18.4, 15.2, 14.8, 16.1, 18.4],
            borderColor: colors.amber,
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor, font: { family: 'JetBrains Mono' } } },
            y: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor, font: { family: 'JetBrains Mono' } } }
          }
        }
      });
    }

    // 6. Top Bandwidth Hogs Chart
    const ctxHogs = document.getElementById('telemetryTopHogsChart');
    if (ctxHogs) {
      telemetryTopHogsChart = new Chart(ctxHogs, {
        type: 'bar',
        data: {
          labels: ['k8s-worker-node-03', 'core-router-west-02', 'db-postgres-primary', 'agg-switch-rack-b', 'san-storage-array-01'],
          datasets: [{
            label: 'Bandwidth (Gbps)',
            data: [18.5, 14.2, 9.8, 9.2, 7.4],
            backgroundColor: [colors.red, colors.amber, colors.blue, colors.purple, colors.teal],
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor, font: { family: 'JetBrains Mono' } } },
            y: { grid: { color: colors.gridColor }, ticks: { color: colors.textColor, font: { family: 'Inter', size: 11 } } }
          }
        }
      });
    }
  }

  function pushRealtimeDataPoint(ingressVal, egressVal, latencyVal) {
    if (!overviewBandwidthChart) return;
    
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Overview chart update
    overviewBandwidthChart.data.labels.shift();
    overviewBandwidthChart.data.labels.push(nowStr);
    overviewBandwidthChart.data.datasets[0].data.shift();
    overviewBandwidthChart.data.datasets[0].data.push(ingressVal);
    overviewBandwidthChart.data.datasets[1].data.shift();
    overviewBandwidthChart.data.datasets[1].data.push(egressVal);
    overviewBandwidthChart.update();

    // Telemetry chart update
    if (telemetryLatencyChart) {
      telemetryLatencyChart.data.labels.shift();
      telemetryLatencyChart.data.labels.push(nowStr);
      telemetryLatencyChart.data.datasets[0].data.shift();
      telemetryLatencyChart.data.datasets[0].data.push(latencyVal);
      telemetryLatencyChart.update();
    }
  }

  function updateChartColors() {
    const colors = getThemeColors();
    [overviewBandwidthChart, overviewStatusDoughnutChart, telemetryIngressEgressChart, telemetryProtocolChart, telemetryLatencyChart, telemetryTopHogsChart].forEach(chart => {
      if (chart) {
        if (chart.options.plugins.legend && chart.options.plugins.legend.labels) {
          chart.options.plugins.legend.labels.color = colors.textColor;
        }
        if (chart.options.scales) {
          if (chart.options.scales.x) {
            if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = colors.gridColor;
            if (chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = colors.textColor;
          }
          if (chart.options.scales.y) {
            if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = colors.gridColor;
            if (chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = colors.textColor;
          }
        }
        chart.update();
      }
    });
  }

  return {
    init,
    pushRealtimeDataPoint,
    updateChartColors
  };
})();
