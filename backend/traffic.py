# traffic.py

import time
import socket
import psutil

from hotspot import get_hotspot_info


# ============================================================
# GET INTERFACE COUNTERS
# ============================================================

def get_interface_counters(interface_name):
    """
    Find network interface counters using the interface name.

    Handles differences between the Windows adapter name
    and the name reported by psutil.

    Parameters:
        interface_name (str):
            Interface name detected by hotspot.py.

    Returns:
        tuple:
            (real_interface_name, counters)

        or:
            None
    """

    counters = psutil.net_io_counters(
        pernic=True
    )

    # --------------------------------------------------------
    # 1. EXACT MATCH
    # --------------------------------------------------------

    for name, data in counters.items():

        if name.lower() == interface_name.lower():

            return name, {
                "bytes_sent": data.bytes_sent,
                "bytes_recv": data.bytes_recv,
                "packets_sent": data.packets_sent,
                "packets_recv": data.packets_recv
            }

    # --------------------------------------------------------
    # 2. PARTIAL MATCH
    # --------------------------------------------------------

    interface_lower = interface_name.lower()

    for name, data in counters.items():

        name_lower = name.lower()

        if (
            interface_lower in name_lower
            or name_lower in interface_lower
        ):

            return name, {
                "bytes_sent": data.bytes_sent,
                "bytes_recv": data.bytes_recv,
                "packets_sent": data.packets_sent,
                "packets_recv": data.packets_recv
            }

    # --------------------------------------------------------
    # 3. FIND INTERFACE USING HOTSPOT IP
    # --------------------------------------------------------

    try:

        addresses = psutil.net_if_addrs()

        for name, adapters in addresses.items():

            for address in adapters:

                if (
                    address.family == socket.AF_INET
                    and address.address == "192.168.137.1"
                ):

                    data = counters.get(name)

                    if data:

                        return name, {
                            "bytes_sent": data.bytes_sent,
                            "bytes_recv": data.bytes_recv,
                            "packets_sent": data.packets_sent,
                            "packets_recv": data.packets_recv
                        }

    except Exception:

        pass

    # --------------------------------------------------------
    # NOTHING FOUND
    # --------------------------------------------------------

    return None


# ============================================================
# HOTSPOT TRAFFIC
# ============================================================

def get_hotspot_traffic(interval=1):
    """
    Measure traffic passing through the Windows
    Mobile Hotspot interface.

    Parameters:
        interval (float):
            Measurement duration in seconds.

    Returns:
        dict
    """

    # --------------------------------------------------------
    # GET HOTSPOT INFORMATION
    # --------------------------------------------------------

    hotspot = get_hotspot_info()

    if not hotspot["success"]:

        return {
            "success": False,
            "error": "Could not read hotspot information."
        }

    # --------------------------------------------------------
    # CHECK IF HOTSPOT IS ACTIVE
    # --------------------------------------------------------

    if not hotspot["hotspot"]["active"]:

        return {
            "success": False,
            "error": "Mobile Hotspot is OFF."
        }

    # --------------------------------------------------------
    # GET HOTSPOT INTERFACE
    # --------------------------------------------------------

    interface_name = hotspot["hotspot"]["interface"]

    if not interface_name:

        return {
            "success": False,
            "error": "Hotspot interface not found."
        }

    # --------------------------------------------------------
    # FIRST COUNTER READING
    # --------------------------------------------------------

    before_result = get_interface_counters(
        interface_name
    )

    if before_result is None:

        return {
            "success": False,
            "error": (
                f"Could not find traffic counters "
                f"for interface: {interface_name}"
            )
        }

    real_interface_name, before = before_result

    # --------------------------------------------------------
    # WAIT
    # --------------------------------------------------------

    time.sleep(interval)

    # --------------------------------------------------------
    # SECOND COUNTER READING
    # --------------------------------------------------------

    after_result = get_interface_counters(
        interface_name
    )

    if after_result is None:

        return {
            "success": False,
            "error": (
                "Could not read interface "
                "counters after measurement."
            )
        }

    _, after = after_result

    # --------------------------------------------------------
    # CALCULATE TRAFFIC
    # --------------------------------------------------------

    download_bytes = (
        after["bytes_recv"]
        - before["bytes_recv"]
    )

    upload_bytes = (
        after["bytes_sent"]
        - before["bytes_sent"]
    )

    # Prevent negative values
    # in case Windows resets the counters.

    download_bytes = max(
        0,
        download_bytes
    )

    upload_bytes = max(
        0,
        upload_bytes
    )

    # --------------------------------------------------------
    # CONVERT TO Mbps
    # --------------------------------------------------------

    download_mbps = (
        download_bytes
        * 8
        / interval
        / 1_000_000
    )

    upload_mbps = (
        upload_bytes
        * 8
        / interval
        / 1_000_000
    )

    # --------------------------------------------------------
    # RETURN RESULT
    # --------------------------------------------------------

    return {

        "success": True,

        "interface": real_interface_name,

        "download_mbps": round(
            download_mbps,
            2
        ),

        "upload_mbps": round(
            upload_mbps,
            2
        ),

        "download_bytes": download_bytes,

        "upload_bytes": upload_bytes,

        "connected_devices": (
            hotspot["connected_devices"]
        ),

        "device_count": (
            hotspot["device_count"]
        )
    }


# ============================================================
# DIRECT TEST
# ============================================================

if __name__ == "__main__":

    print("\n" + "=" * 70)
    print(" HOTSPOT TRAFFIC TEST")
    print("=" * 70)

    try:

        # ----------------------------------------------------
        # HOTSPOT INFORMATION
        # ----------------------------------------------------

        print("\n[1] Checking hotspot...")

        hotspot = get_hotspot_info()

        print(
            f"Hotspot active: "
            f"{hotspot['hotspot']['active']}"
        )

        print(
            f"Interface: "
            f"{hotspot['hotspot']['interface']}"
        )

        print(
            f"Network: "
            f"{hotspot['hotspot']['hotspot_network']}"
        )

        print(
            f"Devices: "
            f"{hotspot['device_count']}"
        )

        # ----------------------------------------------------
        # TRAFFIC MEASUREMENT
        # ----------------------------------------------------

        print("\n[2] Measuring traffic...")

        print(
            "Measuring for 1 second..."
        )

        traffic = get_hotspot_traffic(
            interval=1
        )

        # ----------------------------------------------------
        # DISPLAY RESULT
        # ----------------------------------------------------

        print("\n--- TRAFFIC ---")

        if not traffic["success"]:

            print(
                f"ERROR: "
                f"{traffic['error']}"
            )

        else:

            print(
                f"Interface     : "
                f"{traffic['interface']}"
            )

            print(
                f"Download      : "
                f"{traffic['download_mbps']} Mbps"
            )

            print(
                f"Upload        : "
                f"{traffic['upload_mbps']} Mbps"
            )

            print(
                f"Download bytes: "
                f"{traffic['download_bytes']}"
            )

            print(
                f"Upload bytes  : "
                f"{traffic['upload_bytes']}"
            )

            print(
                f"Devices       : "
                f"{traffic['device_count']}"
            )

            # ------------------------------------------------
            # CONNECTED DEVICES
            # ------------------------------------------------

            print(
                "\n--- CONNECTED DEVICES ---"
            )

            for number, device in enumerate(
                traffic["connected_devices"],
                start=1
            ):

                print(
                    f"\nDevice #{number}"
                )

                print(
                    f"IP  : "
                    f"{device.get('ip')}"
                )

                print(
                    f"MAC : "
                    f"{device.get('mac')}"
                )

        print("\n" + "=" * 70)
        print(" TEST FINISHED")
        print("=" * 70)

    except Exception as error:

        print("\n" + "=" * 70)
        print(" TRAFFIC TEST ERROR")
        print("=" * 70)

        print(
            f"{type(error).__name__}: {error}"
        )

        print("\n" + "=" * 70)