# monitoring.py

import time
import psutil
import socket

from network_info import get_network_info


# ============================================================
# CPU
# ============================================================

def get_cpu_usage():
    """
    Get current CPU usage.

    Returns:
        float: CPU usage percentage.
    """

    return psutil.cpu_percent(interval=0.5)


# ============================================================
# RAM
# ============================================================

def get_ram_usage():
    """
    Get current RAM usage.

    Returns:
        dict
    """

    memory = psutil.virtual_memory()

    return {
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
    
# def get_active_interface():
#     """
#     Find the active network interface.

#     Returns:
#         dict | None
#     """

#     stats = psutil.net_if_stats()
#     addresses = psutil.net_if_addrs()

#     for interface, info in stats.items():

#         if not info.isup:
#             continue

#         if interface.lower() == "loopback":
#             continue

#         ip_address = None

#         for address in addresses.get(interface, []):

#             if address.family == socket.AF_INET:

#                 ip_address = address.address

#                 break

#         if ip_address:

#             return {
#                 "interface": interface,
#                 "ip": ip_address
#             }

#     return None


# ============================================================
# NETWORK SPEED
# ============================================================

def get_network_speed(interval=1):
    """
    Measure network download/upload speed.

    Parameters:
        interval (float):
            Measurement duration in seconds.

    Returns:
        dict
    """

    before = psutil.net_io_counters()

    time.sleep(interval)

    after = psutil.net_io_counters()

    download_bytes = (
        after.bytes_recv -
        before.bytes_recv
    )

    upload_bytes = (
        after.bytes_sent -
        before.bytes_sent
    )

    download_mbps = (
        download_bytes * 8 /
        interval /
        1_000_000
    )

    upload_mbps = (
        upload_bytes * 8 /
        interval /
        1_000_000
    )

    return {

        "download_mbps": round(
            download_mbps,
            2
        ),

        "upload_mbps": round(
            upload_mbps,
            2
        ),

        "download_bytes": download_bytes,

        "upload_bytes": upload_bytes
    }


# ============================================================
# COMPLETE MONITORING INFORMATION
# ============================================================

def get_monitoring_info():
    """
    Collect all laptop monitoring information.

    Returns:
        dict
    """

    network = get_network_info()

    cpu = get_cpu_usage()

    ram = get_ram_usage()

    interface = get_active_interface()

    speed = get_network_speed(
        interval=1
    )

    return {

        "success": True,

        "cpu": {
            "usage_percent": cpu
        },

        "ram": ram,

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

        "speed": speed
    }


# ============================================================
# DIRECT TEST
# ============================================================

if __name__ == "__main__":

    print("\n" + "=" * 70)
    print(" LAPTOP NETWORK MONITORING TEST")
    print("=" * 70)

    try:

        print("\n[1] CPU")

        cpu = get_cpu_usage()

        print(
            f"CPU Usage: {cpu}%"
        )

        print("\n[2] RAM")

        ram = get_ram_usage()

        print(
            f"Usage     : {ram['usage_percent']}%"
        )

        print(
            f"Used      : {ram['used_gb']} GB"
        )

        print(
            f"Available : {ram['available_gb']} GB"
        )

        print(
            f"Total     : {ram['total_gb']} GB"
        )

        print("\n[3] NETWORK INTERFACE")

        interface = get_active_interface()

        if interface:

            print(
                f"Interface : "
                f"{interface['interface']}"
            )

            print(
                f"IP        : "
                f"{interface['ip']}"
            )

        else:

            print(
                "No active interface found."
            )

        print("\n[4] NETWORK SPEED")

        print(
            "Measuring for 1 second..."
        )

        speed = get_network_speed(
            interval=1
        )

        print(
            f"Download  : "
            f"{speed['download_mbps']} Mbps"
        )

        print(
            f"Upload    : "
            f"{speed['upload_mbps']} Mbps"
        )

        print("\n[5] COMPLETE DATA")

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