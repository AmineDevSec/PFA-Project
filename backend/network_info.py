# network_info.py

import socket
import ipaddress
import subprocess
import platform


def get_default_gateway():
    """
    Detect the default gateway automatically.

    Returns:
        str | None: Gateway IP address.
    """

    try:
        if platform.system() == "Windows":

            result = subprocess.check_output(
                ["ipconfig"],
                text=True,
                encoding="utf-8",
                errors="ignore"
            )

            for line in result.splitlines():

                if "Default Gateway" in line:

                    gateway = line.split(":")[-1].strip()

                    if gateway:
                        return gateway

        return None

    except Exception:
        return None


def get_local_ip():
    """
    Detect the local IP used by the laptop.

    Returns:
        str: Local IPv4 address.
    """

    try:

        sock = socket.socket(
            socket.AF_INET,
            socket.SOCK_DGRAM
        )

        # Does not actually send data.
        # It allows Windows to select the active interface.
        sock.connect(("8.8.8.8", 80))

        ip = sock.getsockname()[0]

        sock.close()

        return ip

    except Exception:

        return "127.0.0.1"


def get_interface_name():

    """
    Try to determine the Windows interface name
    associated with the active local IP.

    Returns:
        str | None
    """

    local_ip = get_local_ip()

    try:

        if platform.system() == "Windows":

            result = subprocess.check_output(
                ["ipconfig"],
                text=True,
                encoding="utf-8",
                errors="ignore"
            )

            current_adapter = None

            for line in result.splitlines():

                line = line.strip()

                if line and not line.startswith(
                    ("IPv4", "Subnet", "Default")
                ) and line.endswith(":"):

                    current_adapter = line.rstrip(":")

                if local_ip in line:

                    return current_adapter

        return None

    except Exception:

        return None


def get_network_info():

    """
    Collect all basic network information automatically.

    Returns:
        dict containing:
            interface
            local_ip
            netmask
            network
            gateway
    """

    local_ip = get_local_ip()

    gateway = get_default_gateway()

    interface = get_interface_name()

    # Default fallback.
    # We will improve subnet detection after testing this module.
    netmask = "255.255.255.0"

    try:

        network = str(
            ipaddress.ip_network(
                f"{local_ip}/{netmask}",
                strict=False
            )
        )

    except Exception:

        network = None

    return {

        "interface": interface,

        "local_ip": local_ip,

        "netmask": netmask,

        "network": network,

        "gateway": gateway
    }


# ============================================================
# DIRECT TEST
# ============================================================

if __name__ == "__main__":

    print("\n" + "=" * 60)
    print(" NETWORK INFORMATION TEST")
    print("=" * 60)

    data = get_network_info()

    for key, value in data.items():

        print(f"{key:<15}: {value}")

    print("=" * 60)