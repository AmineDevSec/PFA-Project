from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from network_info import get_network_info
from hotspot import get_hotspot_info
from devices import get_devices
from monitoring import get_monitoring_info
from traffic import get_hotspot_traffic


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Network Monitoring API",
    description="Local network monitoring backend",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "success": True,
        "message": "Network Monitoring API is running"
    }


# ============================================================
# NETWORK INFORMATION
# ============================================================

@app.get("/api/network")
def network():

    try:

        return {
            "success": True,
            "data": get_network_info()
        }

    except Exception as error:

        return {
            "success": False,
            "error": str(error)
        }


# ============================================================
# HOTSPOT INFORMATION
# ============================================================

@app.get("/api/hotspot")
def hotspot():

    try:

        return get_hotspot_info()

    except Exception as error:

        return {
            "success": False,
            "error": str(error)
        }


# ============================================================
# CONNECTED DEVICES
# ============================================================

@app.get("/api/devices")
def devices():

    try:

        return get_devices()

    except Exception as error:

        return {
            "success": False,
            "devices": [],
            "count": 0,
            "error": str(error)
        }


# ============================================================
# MONITORING
# ============================================================

@app.get("/api/monitoring")
def monitoring():

    try:

        return get_monitoring_info()

    except Exception as error:

        return {
            "success": False,
            "error": str(error)
        }


# ============================================================
# HOTSPOT TRAFFIC
# ============================================================

@app.get("/api/traffic")
def traffic():

    try:

        return get_hotspot_traffic(
            interval=1
        )

    except Exception as error:

        return {
            "success": False,
            "error": str(error)
        }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():

    return {
        "success": True,
        "status": "online"
    }


# ============================================================
# RUN DIRECTLY
# ============================================================

if __name__ == "__main__":

    import uvicorn

    print("=" * 70)
    print(" NETWORK MONITORING SERVER")
    print("=" * 70)

    print("\nStarting FastAPI server...")
    print("Dashboard API: http://127.0.0.1:8000")
    print("API documentation: http://127.0.0.1:8000/docs")

    print("\nAvailable endpoints:")

    print("  GET /api/network")
    print("  GET /api/hotspot")
    print("  GET /api/devices")
    print("  GET /api/monitoring")
    print("  GET /api/traffic")

    print("\n" + "=" * 70)

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000
    )