import socket
import psutil
import ipaddress


def get_network_info():
    """
    Detect the network configuration of the machine
    running the dashboard/backend.
    """

    hostname = socket.gethostname()

    # Find the active IPv4 interface
    local_ip = None
    interface_name = None
    netmask = None

    stats = psutil.net_if_stats()
    addresses = psutil.net_if_addrs()

    for interface, addrs in addresses.items():
        if interface not in stats or not stats[interface].isup:
            continue

        for addr in addrs:
            if addr.family == socket.AF_INET:
                # Ignore loopback
                if not addr.address.startswith("127."):
                    local_ip = addr.address
                    netmask = addr.netmask
                    interface_name = interface
                    break

        if local_ip:
            break

    if not local_ip or not netmask:
        raise RuntimeError("Could not detect active network interface")

    network = ipaddress.IPv4Network(
        f"{local_ip}/{netmask}",
        strict=False
    )

    gateway = get_default_gateway()

    return {
        "hostname": hostname,
        "interface": interface_name,
        "local_ip": local_ip,
        "netmask": netmask,
        "network": str(network),
        "gateway": gateway
    }


def get_default_gateway():
    """
    Get the default gateway using the system routing table.
    """

    import subprocess
    import platform

    system = platform.system()

    try:
        if system == "Windows":
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

        elif system == "Linux":
            result = subprocess.check_output(
                ["ip", "route"],
                text=True
            )

            for line in result.splitlines():
                if line.startswith("default"):
                    parts = line.split()

                    if "via" in parts:
                        return parts[parts.index("via") + 1]

    except Exception:
        pass

    return None


if __name__ == "__main__":
    info = get_network_info()

    print("\n=== NETWORK INFORMATION ===")
    print(f"Interface : {info['interface']}")
    print(f"Local IP  : {info['local_ip']}")
    print(f"Netmask   : {info['netmask']}")
    print(f"Network   : {info['network']}")
    print(f"Gateway   : {info['gateway']}")