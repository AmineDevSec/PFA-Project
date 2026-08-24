# monitoring.py

import time
import threading

import psutil

from network_info import get_network_info


# ============================================================
# BACKGROUND METRICS CACHE
# ============================================================

metrics_cache = {
    "cpu": {"usage_percent": 0.0},
    "ram": {
        "usage_percent": 0.0,
        "used_gb": 0.0,
        "total_gb": 0.0,
        "available_gb": 0.0
    },
    "speed": {
        "download_mbps": 0.0,
        "upload_mbps": 0.0,
        "download_bytes": 0,
        "upload_bytes": 0
    }
}

metrics_lock = threading.Lock()


def monitor_metrics_worker():
    """
    Continuously compute heavy metrics on a background thread
    and refresh the shared cache. The API only ever reads from
    the cache, so requests stay fast.
    """

    global metrics_cache

    while True:

        try:

            cpu_val = psutil.cpu_percent(interval=0.5)

            memory = psutil.virtual_memory()

            ram_val = {
                "usage_percent": memory.percent,
                "used_gb": round(
                    memory.used / (1024 ** 3),
                    2
                ),
                "total_gb": round(
                    memory.total / (1024 ** 3),
                    2
                ),
                "available_gb": round(
                    memory.available / (1024 ** 3),
                    2
                )
            }

            before = psutil.net_io_counters()

            time.sleep(1.0)

            after = psutil.net_io_counters()

            dl_b = max(
                0,
                after.bytes_recv - before.bytes_recv
            )

            ul_b = max(
                0,
                after.bytes_sent - before.bytes_sent
            )

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

        except Exception as error:

            print(f"[BACKGROUND METRICS ERROR] {error}")

            time.sleep(2)


threading.Thread(
    target=monitor_metrics_worker,
    daemon=True
).start()


# ============================================================
# NETWORK INTERFACE
# ============================================================

def get_active_interface():
    """
    Get the real active network interface from network_info.py.

    Returns:
        dict | None
    """

    try:
        network = get_network_info()

        interface = network.get("interface")
        local_ip = network.get("local_ip")

        if interface and local_ip:
            return {
                "interface": interface,
                "ip": local_ip
            }

        return None

    except Exception as error:
        print(
            f"[ERROR] Could not get active interface: {error}"
        )
        return None


# ============================================================
# COMPLETE MONITORING INFORMATION
# ============================================================

def get_monitoring_info():
    """
    Collect all laptop monitoring information.

    Heavy values come from the background cache, so this call
    never blocks on CPU sampling or speed measurement.

    Returns:
        dict
    """

    network = get_network_info()

    interface = get_active_interface()

    with metrics_lock:

        cached = dict(metrics_cache)

    return {

        "success": True,

        "cpu": cached["cpu"],

        "ram": cached["ram"],

        "network": {

            "interface": (
                interface["interface"]
                if interface
                else None
            ),

            "ip": (
                interface["ip"]
                if interface
                else network.get("local_ip")
            ),

            "gateway": network.get(
                "gateway"
            ),

            "network": network.get(
                "network"
            )
        },

        "speed": cached["speed"]
    }


# ============================================================
# DIRECT TEST
# ============================================================

if __name__ == "__main__":

    print("\n" + "=" * 70)
    print(" LAPTOP NETWORK MONITORING TEST")
    print("=" * 70)

    try:

        # ----------------------------------------------------
        # Wait for the background worker to fill the cache.
        # ----------------------------------------------------

        print(
            "\nWaiting for background metrics (3 seconds)..."
        )

        time.sleep(3)

        data = get_monitoring_info()

        print("\nCPU:")

        print(
            data["cpu"]
        )

        print("\nRAM:")

        print(
            data["ram"]
        )

        print("\nNETWORK:")

        print(
            data["network"]
        )

        print("\nSPEED:")

        print(
            data["speed"]
        )

        print("\n" + "=" * 70)
        print(" TEST FINISHED")
        print("=" * 70)

    except Exception as error:

        print("\n" + "=" * 70)
        print(" MONITORING ERROR")
        print("=" * 70)

        print(
            f"{type(error).__name__}: {error}"
        )