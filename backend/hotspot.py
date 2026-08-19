# hotspot.py

import subprocess
import re
import ipaddress

from network_info import get_network_info


# ============================================================
# WINDOWS COMMAND HELPER
# ============================================================

def run_command(command):
    """
    Execute a Windows command and return stdout.

    Parameters:
        command (list): Windows command + arguments.

    Returns:
        str: Command output.
    """

    try:

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore"
        )

        return result.stdout

    except Exception as error:

        print(f"[ERROR] Command failed: {error}")

        return ""


# ============================================================
# NETWORK INTERFACES
# ============================================================

def get_hotspot_ip_info():
    """
    Get all IPv4 addresses exposed by Windows adapters.

    Returns:
        list[dict]
    """

    output = run_command(["ipconfig"])

    adapters = []

    current_adapter = None

    for line in output.splitlines():

        # Detect adapter heading
        if line and not line.startswith(" ") and line.endswith(":"):

            current_adapter = line.rstrip(":")

        # Detect IPv4 address
        match = re.search(
            r"IPv4 Address[.\s]*:\s*"
            r"(\d+\.\d+\.\d+\.\d+)",
            line,
            re.IGNORECASE
        )

        if match and current_adapter:

            adapters.append({
                "interface": current_adapter,
                "ip": match.group(1)
            })

    return adapters


# ============================================================
# HOTSPOT INTERFACE
# ============================================================

def get_hotspot_interface():
    """
    Detect the Windows Mobile Hotspot adapter automatically.

    Returns:
        dict | None
    """

    interfaces = get_hotspot_ip_info()

    for adapter in interfaces:

        name = adapter["interface"].lower()
        ip = adapter["ip"]

        # Windows Mobile Hotspot commonly creates
        # an adapter called:
        #
        # Local Area Connection*
        # Connexion au réseau local*
        #
        # and commonly uses 192.168.137.x

        if (
            "local area connection*" in name
            or "connexion au r" in name
            or "wi-fi direct" in name
        ):

            return adapter

        # Additional reliable check:
        # Windows Mobile Hotspot commonly uses 192.168.137.x

        if ip.startswith("192.168.137."):

            return adapter

    return None



# ============================================================
# CHECK WHETHER AN IP IS MULTICAST/BROADCAST
# ============================================================

def is_invalid_device_ip(ip):
    """
    Determine whether an IP should be excluded from
    connected-device results.

    Returns:
        bool
    """

    try:

        address = ipaddress.ip_address(ip)

        # Multicast: 224.0.0.0 - 239.255.255.255
        if address.is_multicast:
            return True

        # Broadcast
        if ip == "255.255.255.255":
            return True

        # Unspecified / loopback
        if address.is_unspecified or address.is_loopback:
            return True

        return False

    except ValueError:

        return True


# ============================================================
# ARP TABLE
# ============================================================

def get_connected_devices(network=None):
    """
    Read Windows ARP table.

    If a network is provided, only devices belonging to that
    network are returned.

    Parameters:
        network (str | None):
            Example: "192.168.137.0/24"

    Returns:
        list[dict]
    """

    output = run_command(["arp", "-a"])

    devices = []

    current_interface = None

    target_network = None

    if network:

        try:
            target_network = ipaddress.ip_network(
                network,
                strict=False
            )

        except ValueError:

            target_network = None

    for line in output.splitlines():

        line = line.strip()

        # ----------------------------------------------------
        # Interface
        # ----------------------------------------------------

        interface_match = re.search(
            r"Interface:\s*"
            r"(\d+\.\d+\.\d+\.\d+)",
            line,
            re.IGNORECASE
        )

        if interface_match:

            current_interface = interface_match.group(1)

            continue

        # ----------------------------------------------------
        # ARP entry
        # ----------------------------------------------------

        match = re.match(
            r"(\d+\.\d+\.\d+\.\d+)\s+"
            r"([0-9a-fA-F-]{17})\s+"
            r"(\w+)",
            line
        )

        if not match:
            continue

        ip = match.group(1)

        mac = match.group(2).replace(
            "-",
            ":"
        )

        entry_type = match.group(3)

        # ----------------------------------------------------
        # Ignore multicast/broadcast/etc.
        # ----------------------------------------------------

        if is_invalid_device_ip(ip):
            continue

        if mac.lower() == "ff:ff:ff:ff:ff:ff":
            continue

        # ----------------------------------------------------
        # Restrict to requested network
        # ----------------------------------------------------

        if target_network:

            try:

                if ipaddress.ip_address(ip) not in target_network:
                    continue

            except ValueError:

                continue

        devices.append({

            "interface_ip": current_interface,

            "ip": ip,

            "mac": mac,

            "type": entry_type

        })

    return devices


# ============================================================
# HOTSPOT INFORMATION
# ============================================================

def get_hotspot_info():
    """
    Collect information about Windows Mobile Hotspot.

    Returns:
        dict
    """

    network = get_network_info()

    interfaces = get_hotspot_ip_info()

    hotspot_interface = get_hotspot_interface()

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # We do NOT say:
    #
    # 192.168.x.x = hotspot
    #
    # because your normal Wi-Fi can also use 192.168.x.x.
    # --------------------------------------------------------

    hotspot_active = hotspot_interface is not None

    connected_devices = []

    if hotspot_interface:

        hotspot_ip = hotspot_interface["ip"]

        try:

            hotspot_network = str(
                ipaddress.ip_network(
                    f"{hotspot_ip}/24",
                    strict=False
                )
            )

            connected_devices = get_connected_devices(
                hotspot_network
            )

        except ValueError:

            hotspot_network = None

    else:

        hotspot_network = None

    return {

        "success": True,

        "hotspot": {

            "active": hotspot_active,

            "interface": (
                hotspot_interface["interface"]
                if hotspot_interface
                else None
            ),

            "hotspot_ip": (
                hotspot_interface["ip"]
                if hotspot_interface
                else None
            ),

            "hotspot_network": hotspot_network,

            "normal_network": network.get("network"),

            "normal_ip": network.get("local_ip"),

            "gateway": network.get("gateway")

        },

        "interfaces": interfaces,

        "connected_devices": connected_devices,

        "device_count": len(connected_devices)

    }


# ============================================================
# DIRECT TEST
# ============================================================

if __name__ == "__main__":

    print("\n" + "=" * 70)
    print(" WINDOWS MOBILE HOTSPOT TEST")
    print("=" * 70)

    try:

        data = get_hotspot_info()

        # ----------------------------------------------------
        # HOTSPOT
        # ----------------------------------------------------

        print("\n--- HOTSPOT ---")

        for key, value in data["hotspot"].items():

            print(
                f"{key:<20}: {value}"
            )

        # ----------------------------------------------------
        # INTERFACES
        # ----------------------------------------------------

        print("\n--- NETWORK INTERFACES ---")

        for interface in data["interfaces"]:

            print(
                f"Interface: "
                f"{interface['interface']}"
            )

            print(
                f"IP       : "
                f"{interface['ip']}"
            )

        # ----------------------------------------------------
        # DEVICES
        # ----------------------------------------------------

        print("\n--- HOTSPOT CONNECTED DEVICES ---")

        if not data["connected_devices"]:

            print(
                "No hotspot devices detected."
            )

        else:

            for number, device in enumerate(
                data["connected_devices"],
                start=1
            ):

                print(
                    f"\nDevice #{number}"
                )

                for key, value in device.items():

                    print(
                        f"{key:<20}: {value}"
                    )

        print(
            f"\nTotal hotspot devices: "
            f"{data['device_count']}"
        )

        print("\n" + "=" * 70)
        print(" TEST FINISHED")
        print("=" * 70)

    except Exception as error:

        print("\n" + "=" * 70)
        print(" HOTSPOT TEST ERROR")
        print("=" * 70)

        print(
            f"{type(error).__name__}: {error}"
        )