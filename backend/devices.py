# devices.py

import re
import socket
import subprocess
import ipaddress
import platform

from concurrent.futures import ThreadPoolExecutor

from hotspot import get_hotspot_info


# ============================================================
# PING
# ============================================================

def ping_device(ip):
    """
    Ping a device and measure approximate latency.

    Parameters:
        ip (str): Device IPv4 address.

    Returns:
        dict
    """

    try:

        if platform.system() == "Windows":

            command = [
                "ping",
                "-n",
                "1",
                "-w",
                "1000",
                ip
            ]

        else:

            command = [
                "ping",
                "-c",
                "1",
                "-W",
                "1",
                ip
            ]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore"
        )

        output = result.stdout

        if result.returncode != 0:

            return {
                "online": False,
                "latency_ms": None
            }

        latency = None

        # Windows output normally contains:
        # time=XXms
        # or
        # time<1ms
        #
        # Linux output normally contains:
        # time=XX.X ms

        match = re.search(
            r"time[=<]\s*([\d.]+)\s*ms",
            output,
            re.IGNORECASE
        )

        if match:

            latency = float(
                match.group(1)
            )

        return {
            "online": True,
            "latency_ms": latency
        }

    except Exception:

        return {
            "online": False,
            "latency_ms": None
        }


# ============================================================
# HOSTNAME
# ============================================================

def get_hostname(ip, timeout=0.5):
    """
    Try to resolve a device IP to a hostname with a
    bounded timeout so slow DNS lookups cannot stall
    the request.

    Parameters:
        ip (str): Device IPv4 address.
        timeout (float): Max seconds to wait.

    Returns:
        str | None
    """

    previous_timeout = socket.getdefaulttimeout()

    try:

        socket.setdefaulttimeout(timeout)

        hostname = socket.gethostbyaddr(ip)[0]

        return hostname

    except (socket.herror, socket.gaierror, socket.timeout, OSError):

        return None

    finally:

        socket.setdefaulttimeout(previous_timeout)


# ============================================================
# DEVICE TYPE
# ============================================================

def guess_device_type(hostname):
    """
    Make a simple device-type guess from hostname.

    Parameters:
        hostname (str | None)

    Returns:
        str
    """

    if not hostname:

        return "Unknown"

    name = hostname.lower()

    if "iphone" in name:

        return "iPhone"

    if "ipad" in name:

        return "iPad"

    if "android" in name:

        return "Android"

    if "samsung" in name:

        return "Samsung"

    if "desktop" in name:

        return "PC"

    if "laptop" in name:

        return "Laptop"

    if "macbook" in name:

        return "MacBook"

    return "Unknown"


# ============================================================
# DEVICE INFORMATION
# ============================================================

def enrich_device(device):
    """
    Add hostname, latency, status and device type.

    The live ping result decides the ONLINE/OFFLINE status;
    ARP presence alone is not treated as proof of activity.

    Parameters:
        device (dict)

    Returns:
        dict
    """

    ip = device["ip"]

    hostname = get_hostname(ip)

    ping = ping_device(ip)

    device["hostname"] = hostname or ip

    device["latency_ms"] = ping["latency_ms"]

    device["online"] = ping["online"]

    device["status"] = (
        "ONLINE"
        if ping["online"]
        else "OFFLINE"
    )

    device["ping_reachable"] = ping["online"]

    device["device_type"] = guess_device_type(
        hostname
    )

    return device


# ============================================================
# PARALLEL ENRICHMENT
# ============================================================

def enrich_devices(raw_devices, max_workers=10):
    """
    Enrich all devices in parallel so slow DNS/ping on one
    device cannot serialize the whole request.

    Parameters:
        raw_devices (list[dict])

        max_workers (int)

    Returns:
        list[dict]
    """

    if not raw_devices:

        return []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:

        return list(
            executor.map(
                enrich_device,
                [device.copy() for device in raw_devices]
            )
        )


# ============================================================
# GET HOTSPOT DEVICES
# ============================================================

def get_devices():
    """
    Get devices currently connected/visible on the
    laptop's Mobile Hotspot.

    Returns:
        dict
    """

    hotspot = get_hotspot_info()

    if not hotspot["success"]:

        return {
            "success": False,
            "devices": [],
            "count": 0,
            "error": "Could not read hotspot information."
        }

    if not hotspot["hotspot"]["active"]:

        return {
            "success": True,
            "devices": [],
            "count": 0,
            "error": "Mobile Hotspot is OFF."
        }

    devices = hotspot["connected_devices"]

    enriched_devices = enrich_devices(devices)

    return {

        "success": True,

        "devices": enriched_devices,

        "count": len(enriched_devices),

        "network": hotspot["hotspot"][
            "hotspot_network"
        ]
    }


# ============================================================
# DIRECT TEST
# ============================================================

if __name__ == "__main__":

    print("\n" + "=" * 70)
    print(" HOTSPOT DEVICE MONITOR TEST")
    print("=" * 70)

    try:

        data = get_devices()

        print(
            f"\nSuccess: "
            f"{data['success']}"
        )

        print(
            f"Network: "
            f"{data.get('network')}"
        )

        print(
            f"Devices: "
            f"{data['count']}"
        )

        if data.get("error"):

            print(
                f"\nMessage: "
                f"{data['error']}"
            )

        for number, device in enumerate(
            data["devices"],
            start=1
        ):

            print(
                f"\n--- DEVICE #{number} ---"
            )

            for key, value in device.items():

                print(
                    f"{key:<20}: {value}"
                )

    except Exception as error:

        print("\n[ERROR] devices.py failed")

        print(
            f"{type(error).__name__}: {error}"
        )

    print("\n" + "=" * 70)
    print(" TEST FINISHED")
    print("=" * 70)