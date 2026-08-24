# network_info.py

import os
import struct
import socket
import ipaddress
import subprocess
import platform

import psutil


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

        else:

            return _get_gateway_linux()

    except Exception:
        return None


def _get_gateway_linux():
    """
    Read the default gateway from /proc/net/route (Linux).

    Returns:
        str | None: Gateway IP address.
    """

    try:

        with open("/proc/net/route", "r") as route_file:

            next(route_file)  # skip header

            for line in route_file:

                fields = line.strip().split()

                if len(fields) < 3:
                    continue

                destination = fields[1]
                gateway_hex = fields[2]

                # Default route has destination 0.0.0.0
                if destination != "00000000":
                    continue

                gateway_ip = socket.inet_ntoa(
                    struct.pack("<L", int(gateway_hex, 16))
                )

                if gateway_ip != "0.0.0.0":
                    return gateway_ip

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
        # It allows the OS to select the active interface.
        sock.connect(("8.8.8.8", 80))

        ip = sock.getsockname()[0]

        sock.close()

        return ip

    except Exception:

        return "127.0.0.1"


def get_interface_name():
    """
    Determine the network interface name associated
    with the active local IP.

    Returns:
        str | None
    """

    if platform.system() == "Windows":

        return _get_interface_windows()

    return _get_interface_psutil()


def _get_interface_windows():
    """
    Try to determine the Windows interface name
    associated with the active local IP.

    Returns:
        str | None
    """

    local_ip = get_local_ip()

    try:

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


def _get_interface_psutil():
    """
    Find the interface name holding the active local IP
    using psutil (cross-platform, no shell parsing).

    Returns:
        str | None
    """

    local_ip = get_local_ip()

    try:

        addresses = psutil.net_if_addrs()

        for interface_name, addr_list in addresses.items():

            if interface_name.lower() == "lo":
                continue

            for address in addr_list:

                if (
                    address.family == socket.AF_INET
                    and address.address == local_ip
                ):

                    return interface_name

        return None

    except Exception:

        return None


def get_netmask(local_ip=None):
    """
    Detect the netmask of the active interface via psutil.

    Falls back to 255.255.255.0 when unavailable.

    Returns:
        str
    """

    try:

        if not local_ip:
            local_ip = get_local_ip()

        addresses = psutil.net_if_addrs()

        for _, addr_list in addresses.items():

            for address in addr_list:

                if (
                    address.family == socket.AF_INET
                    and address.address == local_ip
                    and address.netmask
                ):

                    return address.netmask

        return "255.255.255.0"

    except Exception:

        return "255.255.255.0"


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

    netmask = get_netmask(local_ip)

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