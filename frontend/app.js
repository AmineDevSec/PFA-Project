// ============================================================
// OBSIDIAN FLUX - FRONTEND APPLICATION
// Connects to the Network Monitoring FastAPI backend.
// ============================================================

const API_BASE = "http://127.0.0.1:8000";

const REFRESH_INTERVAL_MS = 5000;

// ============================================================
// HELPERS
// ============================================================

function escapeHTML(str) {
  if (str === undefined || str === null) return "--";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatBytes(bytes) {
  if (bytes === undefined || bytes === null) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setProgress(barId, percent, warnAt = 70, dangerAt = 90) {
  const bar = document.getElementById(barId);
  if (!bar) return;

  const clamped = Math.max(0, Math.min(100, percent || 0));
  bar.style.width = `${clamped}%`;

  bar.classList.remove("warn", "danger");
  if (clamped >= dangerAt) bar.classList.add("danger");
  else if (clamped >= warnAt) bar.classList.add("warn");
}

async function fetchJSON(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function updateClock() {
  const now = new Date();
  setText("last-updated", `LAST UPDATE: ${now.toLocaleTimeString()}`);
}

function setApiStatus(online) {
  const dot = document.getElementById("api-status-dot");
  const text = document.getElementById("api-status-text");

  if (online) {
    dot.classList.remove("offline");
    dot.classList.add("online");
    text.textContent = "API Connected";
  } else {
    dot.classList.remove("online");
    dot.classList.add("offline");
    text.textContent = "API Unreachable";
  }
}

// ============================================================
// SECTION: HEALTH
// ============================================================

async function loadHealth() {
  try {
    await fetchJSON("/api/health");
    setApiStatus(true);
  } catch (error) {
    setApiStatus(false);
  }
}

// ============================================================
// SECTION: NETWORK
// ============================================================

async function loadNetwork() {
  try {
    const result = await fetchJSON("/api/network");

    if (!result.success) throw new Error(result.error);

    const data = result.data;

    setText("net-interface", data.interface || "--");
    setText("net-local-ip", data.local_ip || "--");
    setText("net-netmask", data.netmask || "--");
    setText("net-network", data.network || "--");
    setText("net-gateway", data.gateway || "--");
  } catch (error) {
    console.error("loadNetwork error:", error);
  }
}

// ============================================================
// SECTION: HOTSPOT
// ============================================================

async function loadHotspot() {
  try {
    const data = await fetchJSON("/api/hotspot");

    if (!data.success) throw new Error(data.error);

    const hotspot = data.hotspot;

    setText("hotspot-interface", hotspot.interface || "--");
    setText("hotspot-ip", hotspot.hotspot_ip || "--");
    setText("hotspot-network", hotspot.hotspot_network || "--");
    setText("hotspot-device-count", data.device_count ?? "--");

    const chip = document.getElementById("hotspot-status-chip");
    const chipText = document.getElementById("hotspot-status-text");

    chip.classList.remove("online", "offline");

    if (hotspot.active) {
      chip.classList.add("online");
      chipText.textContent = "ACTIVE";
    } else {
      chip.classList.add("offline");
      chipText.textContent = "OFFLINE";
    }
  } catch (error) {
    console.error("loadHotspot error:", error);
  }
}

// ============================================================
// SECTION: DEVICES
// ============================================================

async function loadDevices() {
  try {
    const data = await fetchJSON("/api/devices");

    const body = document.getElementById("devices-body");
    const note = document.getElementById("devices-note");

    setText("devices-count", `${data.count || 0} DEVICES`);
    note.textContent = data.error || "";

    if (!data.devices || data.devices.length === 0) {
      body.innerHTML = `<tr><td colspan="6" class="empty-row">No connected devices found</td></tr>`;
      return;
    }

    body.innerHTML = data.devices.map((device) => {
      const isOnline = device.online;
      const statusClass = isOnline ? "online" : "offline";
      const statusLabel = device.status || (isOnline ? "ONLINE" : "OFFLINE");
      const latency = device.latency_ms !== null && device.latency_ms !== undefined
        ? `${device.latency_ms} ms`
        : "--";

      return `
        <tr>
          <td><span class="chip ${statusClass}"><span class="chip-dot"></span>${escapeHTML(statusLabel)}</span></td>
          <td>${escapeHTML(device.hostname)}</td>
          <td class="mono">${escapeHTML(device.ip)}</td>
          <td class="mono">${escapeHTML(device.mac)}</td>
          <td>${escapeHTML(device.device_type)}</td>
          <td class="mono">${escapeHTML(latency)}</td>
        </tr>
      `;
    }).join("");
  } catch (error) {
    console.error("loadDevices error:", error);
  }
}

// ============================================================
// SECTION: MONITORING (CPU / RAM / SPEED)
// ============================================================

async function loadMonitoring() {
  try {
    const data = await fetchJSON("/api/monitoring");

    if (!data.success) throw new Error(data.error);

    const cpuPercent = data.cpu.usage_percent;
    setText("cpu-value", `${cpuPercent.toFixed(1)}%`);
    setProgress("cpu-bar", cpuPercent);

    const ram = data.ram;
    setText("ram-value", `${ram.usage_percent.toFixed(1)}%`);
    setProgress("ram-bar", ram.usage_percent);
    setText("ram-detail", `${ram.used_gb} / ${ram.total_gb} GB`);

    const speed = data.speed;
    document.getElementById("download-value").innerHTML =
      `${speed.download_mbps.toFixed(2)}<span class="metric-unit">Mbps</span>`;
    setText("download-bytes", formatBytes(speed.download_bytes));

    document.getElementById("upload-value").innerHTML =
      `${speed.upload_mbps.toFixed(2)}<span class="metric-unit">Mbps</span>`;
    setText("upload-bytes", formatBytes(speed.upload_bytes));
  } catch (error) {
    console.error("loadMonitoring error:", error);
  }
}

// ============================================================
// SECTION: HOTSPOT TRAFFIC
// ============================================================

async function loadTraffic() {
  try {
    const data = await fetchJSON("/api/traffic");

    const errorEl = document.getElementById("traffic-error");

    if (!data.success) {
      errorEl.textContent = data.error || "Traffic unavailable";
      document.getElementById("traffic-download").innerHTML = `0.00<span class="metric-unit">Mbps</span>`;
      document.getElementById("traffic-upload").innerHTML = `0.00<span class="metric-unit">Mbps</span>`;
      setText("traffic-interface", "--");
      return;
    }

    errorEl.textContent = "";

    document.getElementById("traffic-download").innerHTML =
      `${data.download_mbps.toFixed(2)}<span class="metric-unit">Mbps</span>`;
    document.getElementById("traffic-upload").innerHTML =
      `${data.upload_mbps.toFixed(2)}<span class="metric-unit">Mbps</span>`;
    setText("traffic-interface", data.interface || "--");
  } catch (error) {
    console.error("loadTraffic error:", error);
  }
}

// ============================================================
// REFRESH ALL
// ============================================================

async function refreshAll() {
  await loadHealth();

  await Promise.all([
    loadNetwork(),
    loadHotspot(),
    loadDevices(),
    loadMonitoring(),
    loadTraffic()
  ]);

  updateClock();
}

// ============================================================
// NAVIGATION (sidebar smooth scroll + active state)
// ============================================================

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();

      navItems.forEach((el) => el.classList.remove("active"));
      item.classList.add("active");

      const sectionId = item.dataset.section;
      const target = document.getElementById(sectionId);

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();

  refreshAll();

  document.getElementById("refresh-btn").addEventListener("click", refreshAll);

  setInterval(refreshAll, REFRESH_INTERVAL_MS);
});
