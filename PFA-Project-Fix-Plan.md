# PFA-Project — Full Fix Plan

**Based on:** ANALYSIS.md audit
**Date:** August 24, 2026
**Goal:** Take PFA-Project from broken-on-Linux / insecure / slow to a reliable, secure, cross-platform dashboard.

---

## Phase 1 — Critical: Get it running on Linux at all (Day 1)

The app is functionally broken on the dev OS. Fix this before anything else.

### 1. Cross-platform command dispatch
In `network_info.py` and `hotspot.py`, wrap every OS-specific call behind a `platform.system()` check:

```python
import platform

def get_active_interface():
    if platform.system() == "Windows":
        return _get_interface_windows()  # existing ipconfig logic
    else:
        return _get_interface_linux()    # new: use psutil or /sys/class/net
```

Prefer `psutil.net_if_addrs()` / `psutil.net_if_stats()` over shelling out at all where possible — it's natively cross-platform and avoids parsing terminal output entirely.

### 2. Linux ARP parsing
Replace the regex-based `arp -a` parsing with a direct read of `/proc/net/arp`:

```python
def get_connected_devices_linux():
    devices = []
    try:
        with open("/proc/net/arp", "r") as arp_file:
            next(arp_file)  # skip header
            for line in arp_file:
                parts = line.split()
                if len(parts) >= 6:
                    ip = parts[0]
                    mac = parts[3]
                    flags = parts[2]
                    interface = parts[5]

                    if flags != "0x0" and mac != "00:00:00:00:00:00":
                        devices.append({
                            "interface_ip": None,
                            "ip": ip,
                            "mac": mac,
                            "type": "dynamic" if flags == "0x2" else "static"
                        })
    except Exception as e:
        print(f"[ERROR] Failed to read Linux ARP cache: {e}")
    return devices
```

This is more reliable than regex-matching terminal output, since `/proc/net/arp` has a fixed column format. Keep the Windows regex path for `platform.system() == "Windows"`.

### 3. Ping latency regex
One-line fix in `devices.py` (line 72):

```python
match = re.search(r"time[=<]\s*([\d.]+)\s*ms", output, re.IGNORECASE)
```

Cast with `float()` instead of `int()` downstream.

**✅ Exit criteria:** Dashboard loads on Linux, shows real connected devices, no `FileNotFoundError` in logs.

---

## Phase 2 — Critical: Security (Day 1–2, don't ship without this)

### 4. XSS via innerHTML
Add an escaping utility to the top of `frontend/app.js` and use it for every dynamic field:

```javascript
function escapeHTML(str) {
  if (str === undefined || str === null) return "--";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
```

This is a real, exploitable vulnerability: hostnames come from untrusted DHCP clients. Any device joining the hotspot can inject a hostname like `<img src=x onerror=...>` and run JS in the admin's session.

**Test it:** connect a device (or spoof via `nmcli` / router config) with a hostname containing `<script>` tags and confirm it renders as literal text, not executable code.

---

## Phase 3 — High: Performance (Day 2–3)

### 5. Background-threaded metrics
Refactor `backend/monitoring.py` so heavy metrics are computed on a background thread and the API just reads from a cache:

```python
import threading
import time
import psutil
from network_info import get_network_info

metrics_cache = {
    "cpu": {"usage_percent": 0.0},
    "ram": {"usage_percent": 0.0, "used_gb": 0.0, "total_gb": 0.0, "available_gb": 0.0},
    "speed": {"download_mbps": 0.0, "upload_mbps": 0.0, "download_bytes": 0, "upload_bytes": 0}
}
metrics_lock = threading.Lock()

def monitor_metrics_worker():
    global metrics_cache
    while True:
        try:
            cpu_val = psutil.cpu_percent(interval=0.5)

            memory = psutil.virtual_memory()
            ram_val = {
                "usage_percent": memory.percent,
                "used_gb": round(memory.used / (1024 ** 3), 2),
                "total_gb": round(memory.total / (1024 ** 3), 2),
                "available_gb": round(memory.available / (1024 ** 3), 2)
            }

            before = psutil.net_io_counters()
            time.sleep(1.0)
            after = psutil.net_io_counters()

            dl_b = max(0, after.bytes_recv - before.bytes_recv)
            ul_b = max(0, after.bytes_sent - before.bytes_sent)

            with metrics_lock:
                metrics_cache = {
                    "cpu": {"usage_percent": cpu_val},
                    "ram": ram_val,
                    "speed": {
                        "download_mbps": round(dl_b * 8 / 1_000_000, 2),
                        "upload_mbps": round(ul_b * 8 / 1_000_000, 2),
                        "download_bytes": dl_b,
                        "upload_bytes": ul_b
                    }
                }
        except Exception as e:
            print(f"[BACKGROUND METRICS ERROR] {e}")
            time.sleep(2)

threading.Thread(target=monitor_metrics_worker, daemon=True).start()

def get_monitoring_info():
    network = get_network_info()
    interface = get_active_interface()

    with metrics_lock:
        cached = dict(metrics_cache)

    return {
        "success": True,
        "cpu": cached["cpu"],
        "ram": cached["ram"],
        "network": {
            "interface": interface["interface"] if interface else None,
            "ip": interface["ip"] if interface else network.get("local_ip"),
            "gateway": network.get("gateway"),
            "network": network.get("network")
        },
        "speed": cached["speed"]
    }
```

> Note: added a `threading.Lock()` around cache reads/writes for safety if fields are ever added incrementally — plain dict reassignment is atomic enough today, but don't rely on that as the cache grows.

Turns `/api/monitoring` from a 1.5s blocking call into a <5ms cache read.

### 6. Parallel + timeout-bounded DNS resolution
`socket.gethostbyaddr()` hanging 2–5s per device compounds badly (5 devices = up to 25s). Fix with both a timeout and parallelism:

```python
import socket
from concurrent.futures import ThreadPoolExecutor

def enrich_device(device):
    socket.setdefaulttimeout(0.5)
    try:
        hostname = socket.gethostbyaddr(device["ip"])[0]
    except (socket.herror, socket.timeout):
        hostname = None
    device["hostname"] = hostname
    # ... rest of enrichment logic
    return device

def get_all_devices(raw_devices):
    with ThreadPoolExecutor(max_workers=10) as executor:
        return list(executor.map(enrich_device, raw_devices))
```

5 devices resolve in parallel (~0.5s total) instead of serially (~10–25s).

---

## Phase 4 — Medium: Logic correctness (Day 3)

### 7. Fix hardcoded `online = True`
`devices.py` line 173 currently forces every device to show as online regardless of real status. Fix:

```python
device["online"] = ping["online"]
device["status"] = "ONLINE" if ping["online"] else "OFFLINE"
device["ping_reachable"] = ping["online"]
```

Trust the live ping result rather than stale ARP presence. If some devices block ICMP and you want an ARP fallback, use an explicit freshness window instead of blind `True`:

```python
device["online"] = ping["online"] or (arp_recent and mac_seen_within(60))
```

---

## Phase 5 — Low: Cleanup

### 8. Remove dead code
Delete the commented-out duplicate `enrich_device()` block in `devices.py` (lines 191–234).

### 9. Remove redundant DOM mutation
In `frontend/app.js` line 218, drop the `setText` call and keep only the (now-escaped) `innerHTML` write.

---

## Execution Summary

| Priority | Fix | File(s) | Effort | Blocking? |
|---|---|---|---|---|
| P0 | Cross-platform interface/ARP detection | `network_info.py`, `hotspot.py` | 2–3h | Yes — app doesn't run without it |
| P0 | XSS escaping | `frontend/app.js` | 20min | Yes — security |
| P0 | Ping regex float fix | `devices.py` | 5min | Yes — data correctness |
| P1 | Background metrics thread | `monitoring.py` | 1h | No, but major UX win |
| P1 | Parallel DNS resolution | `devices.py` | 1h | No, but major UX win |
| P2 | Online status logic | `devices.py` | 30min | No |
| P3 | Remove dead code | `devices.py`, `app.js` | 15min | No |

**Estimated total time to production-ready:** ~1–1.5 focused days.

---

## Suggested Testing Checklist

- [ ] Run backend on Linux — confirm no `FileNotFoundError` in logs
- [ ] `/api/devices` returns real connected devices via `/proc/net/arp`
- [ ] Ping latency values show decimals correctly (e.g. `14.2 ms`)
- [ ] Inject a malicious hostname (`<script>alert(1)</script>`) via a test device and confirm it renders as text, not executes
- [ ] `/api/monitoring` responds in <5ms after warm-up
- [ ] Disconnect a device and confirm it flips to OFFLINE within one ping cycle (not stuck for 10 min)
- [ ] Load test `/api/devices` with 5+ simulated devices, confirm response under ~1s total
- [ ] Confirm Windows code path (`ipconfig`, `arp -a` with hyphens) still works unchanged
