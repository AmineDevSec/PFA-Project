import psutil
import time
from datetime import datetime


def get_cpu_usage():
    """
    Get current CPU usage.

    Parameters:
        None

    Returns:
        float: CPU usage percentage.
    """

    return psutil.cpu_percent(interval=1)


def get_ram_usage():
    """
    Get current RAM usage.

    Parameters:
        None

    Returns:
        dict:
            total_gb
            used_gb
            available_gb
            percent
    """

    memory = psutil.virtual_memory()

    return {
        "total_gb": round(memory.total / (1024 ** 3), 2),
        "used_gb": round(memory.used / (1024 ** 3), 2),
        "available_gb": round(memory.available / (1024 ** 3), 2),
        "percent": memory.percent
    }


def get_network_bytes():
    """
    Get total network traffic since the computer started.

    Returns:
        dict:
            bytes_sent
            bytes_received
            mb_sent
            mb_received
    """

    network = psutil.net_io_counters()

    return {
        "bytes_sent": network.bytes_sent,
        "bytes_received": network.bytes_recv,
        "mb_sent": round(
            network.bytes_sent / (1024 ** 2), 2
        ),
        "mb_received": round(
            network.bytes_recv / (1024 ** 2), 2
        )
    }


def get_network_speed(interval=1):
    """
    Measure current network transfer speed.

    Parameters:
        interval (float):
            Number of seconds between measurements.

    Returns:
        dict:
            download_mbps
            upload_mbps
    """

    before = psutil.net_io_counters()

    time.sleep(interval)

    after = psutil.net_io_counters()

    bytes_received = (
        after.bytes_recv -
        before.bytes_recv
    )

    bytes_sent = (
        after.bytes_sent -
        before.bytes_sent
    )

    # bytes → bits → megabits
    download_mbps = (
        bytes_received * 8
    ) / interval / (1024 ** 2)

    upload_mbps = (
        bytes_sent * 8
    ) / interval / (1024 ** 2)

    return {
        "download_mbps": round(
            download_mbps, 2
        ),
        "upload_mbps": round(
            upload_mbps, 2
        )
    }


def get_monitoring_data():
    """
    Collect all monitoring information.

    Returns:
        dict containing CPU, RAM and network data.
    """

    cpu = get_cpu_usage()
    ram = get_ram_usage()
    network = get_network_bytes()
    speed = get_network_speed()

    return {
        "timestamp": datetime.now().isoformat(),

        "cpu": {
            "percent": cpu
        },

        "ram": ram,

        "network": {
            "bytes_sent": network["bytes_sent"],
            "bytes_received": network["bytes_received"],
            "mb_sent": network["mb_sent"],
            "mb_received": network["mb_received"],
            "download_mbps": speed["download_mbps"],
            "upload_mbps": speed["upload_mbps"]
        }
    }


# ============================================================
# TEST
# ============================================================

# if __name__ == "__main__":

#     print("\n========== SYSTEM MONITORING ==========\n")

#     data = get_monitoring_data()

#     print(
#         f"CPU Usage      : "
#         f"{data['cpu']['percent']}%"
#     )

#     print(
#         f"RAM Usage      : "
#         f"{data['ram']['percent']}%"
#     )

#     print(
#         f"RAM Used       : "
#         f"{data['ram']['used_gb']} GB"
#     )

#     print(
#         f"RAM Available  : "
#         f"{data['ram']['available_gb']} GB"
#     )

#     print(
#         f"Download Speed : "
#         f"{data['network']['download_mbps']} Mbps"
#     )

#     print(
#         f"Upload Speed   : "
#         f"{data['network']['upload_mbps']} Mbps"
#     )

#     print(
#         f"Total Received : "
#         f"{data['network']['mb_received']} MB"
#     )

#     print(
#         f"Total Sent     : "
#         f"{data['network']['mb_sent']} MB"
#     )

#     print(
#         f"\nTimestamp      : "
#         f"{data['timestamp']}"
#     )