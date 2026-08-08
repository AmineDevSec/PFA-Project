from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from Network_info import get_network_info
from Scanner import scan_network

import os


# ============================================================
# FastAPI application
# ============================================================

app = FastAPI(
    title="Obsidian Flux Network API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================
# Allows your HTML/JavaScript frontend to communicate
# with the Python backend.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API: Basic test
# ============================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "Obsidian Flux API"
    }


# ============================================================
# API: Automatically detect network
# ============================================================

@app.get("/api/network")
def network_information():

    try:
        info = get_network_info()

        return {
            "success": True,
            "data": info
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# API: Scan automatically detected network
# ============================================================

@app.get("/api/scan")
def scan_local_network():

    try:

        # 1. Detect network automatically
        network_info = get_network_info()

        network = network_info["network"]

        # 2. Scan detected network
        devices = scan_network(network)

        return {
            "success": True,
            "network": network_info,
            "devices": devices,
            "total_devices": len(devices)
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# API: Scan a specific network
# ============================================================

@app.get("/api/scan/{network}")
def scan_specific_network(network: str):

    try:

        devices = scan_network(network)

        return {
            "success": True,
            "network": network,
            "devices": devices,
            "total_devices": len(devices)
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# API: Ping single IP
# ============================================================

from pydantic import BaseModel
class PingRequest(BaseModel):
    ip: str

@app.post("/api/ping")
def ping_target(req: PingRequest):
    from Scanner import ping_host
    latency = ping_host(req.ip)
    return {
        "success": latency is not None,
        "ip": req.ip,
        "latency": latency
    }


# ============================================================
# API: Real-time Host System Metrics
# ============================================================

@app.get("/api/system")
def system_metrics():
    import psutil
    cpu = psutil.cpu_percent(interval=None)
    ram = psutil.virtual_memory().percent
    net_io = psutil.net_io_counters()
    return {
        "success": True,
        "cpu_percent": cpu,
        "ram_percent": ram,
        "bytes_sent": net_io.bytes_sent,
        "bytes_recv": net_io.bytes_recv
    }


# ============================================================
# Serve frontend
# ============================================================

FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

if os.path.exists(FRONTEND_DIR):
    app.mount(
        "/",
        StaticFiles(
            directory=FRONTEND_DIR,
            html=True
        ),
        name="frontend"
    )