"""
FleetFlow — Real-Time Fleet Management System
FastAPI Backend

Endpoints:
  POST   /auth/register
  POST   /auth/login
  POST   /auth/refresh
  GET    /auth/me

  GET    /api/stats              (Fleet Manager, Dispatcher)
  GET    /api/vehicles           (Fleet Manager, Dispatcher)
  POST   /api/vehicles           (Fleet Manager)
  PATCH  /api/vehicles/{id}      (Fleet Manager)
  DELETE /api/vehicles/{id}      (Fleet Manager)

  GET    /api/drivers            (Fleet Manager, Dispatcher, Safety Officer)
  POST   /api/drivers            (Fleet Manager, Safety Officer)
  PATCH  /api/drivers/{id}       (Fleet Manager, Safety Officer)
  DELETE /api/drivers/{id}       (Fleet Manager)

  GET    /api/trips              (Fleet Manager, Dispatcher)
  POST   /api/trips              (Fleet Manager, Dispatcher)
  PATCH  /api/trips/{id}/status  (Fleet Manager, Dispatcher)
  DELETE /api/trips/{id}         (Fleet Manager)

  GET    /api/maintenance        (Fleet Manager, Safety Officer)
  POST   /api/maintenance        (Fleet Manager)
  DELETE /api/maintenance/{id}   (Fleet Manager)

  GET    /api/fuel               (Fleet Manager, Financial Analyst)
  POST   /api/fuel               (Fleet Manager, Dispatcher)

  GET    /api/reports/fuel-efficiency     (Fleet Manager, Financial Analyst)
  GET    /api/reports/monthly-expenses    (Fleet Manager, Financial Analyst)
  GET    /api/reports/vehicle-profitability (Fleet Manager, Financial Analyst)
  GET    /api/reports/alerts              (Fleet Manager, Safety Officer, Dispatcher)
  GET    /api/reports/export/csv?report=  (Fleet Manager, Financial Analyst)
  GET    /api/reports/export/pdf?report=  (Fleet Manager, Financial Analyst)

  GET    /api/seed               (Initial demo data injection)

  WS     /ws                    (Live event stream)
"""

import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db, Base
import models
from auth import hash_password, require_roles, get_current_user
from websocket_manager import manager
from routers import auth_router, vehicles_router, drivers_router, trips_router, maintenance_router, reports_router, fuel_router

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FleetFlow API",
    description="Real-Time Fleet Management System — Python/FastAPI Backend",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth_router.router)
app.include_router(vehicles_router.router)
app.include_router(drivers_router.router)
app.include_router(trips_router.router)
app.include_router(maintenance_router.router)
app.include_router(reports_router.router)
app.include_router(fuel_router.router)


# ========================
#  DASHBOARD STATS
# ========================
@app.get("/api/stats", tags=["Dashboard"])
def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst")),
):
    """Live dashboard statistics from database."""
    return {
        "active_vehicles": db.query(models.Vehicle).filter(
            models.Vehicle.status.in_(["available", "on_trip"])
        ).count(),
        "maintenance_alerts": db.query(models.Vehicle).filter(
            models.Vehicle.status == "in_shop"
        ).count(),
        "idle_vehicles": db.query(models.Vehicle).filter(
            models.Vehicle.status == "available"
        ).count(),
        "pending_shipments": db.query(models.Trip).filter(
            models.Trip.status == "draft"
        ).count(),
        "total_drivers": db.query(models.Driver).count(),
        "suspended_drivers": db.query(models.Driver).filter(
            models.Driver.duty_status == "suspended"
        ).count(),
    }


# ========================
#  WEBSOCKET ENDPOINT
# ========================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket for real-time fleet events.
    Events emitted by server:
      - dashboardUpdate  { stats object }
      - vehicleCreated   { vehicle object }
      - vehicleStatusUpdated { vehicle object }
      - tripStatusUpdated { trip_id, status }
      - alert            { type, message, severity, entity_id }
    """
    await manager.connect(websocket)
    # On connect: send initial dashboard update
    db = next(get_db())
    try:
        stats = {
            "active_vehicles": db.query(models.Vehicle).filter(
                models.Vehicle.status.in_(["available", "on_trip"])
            ).count(),
            "maintenance_alerts": db.query(models.Vehicle).filter(
                models.Vehicle.status == "in_shop"
            ).count(),
            "idle_vehicles": db.query(models.Vehicle).filter(
                models.Vehicle.status == "available"
            ).count(),
            "pending_shipments": db.query(models.Trip).filter(
                models.Trip.status == "draft"
            ).count(),
        }
        await manager.dashboard_update(stats)
    finally:
        db.close()

    try:
        while True:
            await websocket.receive_text()  # keep alive (ping/pong)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ========================
#  SEED ENDPOINT (Dev Only)
# ========================
@app.post("/api/seed", tags=["Dev"])
def seed_database(db: Session = Depends(get_db)):
    """
    Seeds the database with realistic demo data.
    Safe to call multiple times — skips if admin already exists.
    """
    # Check if already seeded
    if db.query(models.User).count() > 0:
        return {"msg": "Database already seeded. Use /api/seed/reset to clear and re-seed."}

    # ---- USERS ----
    users_data = [
        {"name": "Admin Flow", "email": "admin@fleetflow.com", "password": "admin123", "role": "Fleet Manager"},
        {"name": "Dispatcher Dan", "email": "dispatcher@fleetflow.com", "password": "admin123", "role": "Dispatcher"},
        {"name": "Safety Sam", "email": "safety@fleetflow.com", "password": "admin123", "role": "Safety Officer"},
        {"name": "Finance Fay", "email": "finance@fleetflow.com", "password": "admin123", "role": "Financial Analyst"},
    ]
    for u in users_data:
        user = models.User(
            name=u["name"],
            email=u["email"],
            hashed_password=hash_password(u["password"]),
            role=u["role"],
            is_active=True,
        )
        db.add(user)

    # ---- VEHICLES ----
    vehicles_data = [
        {"plate_number": "XY98-12A", "vehicle_type": "Semi-Truck", "max_weight": 15000, "mileage": 45210, "status": "available"},
        {"plate_number": "AB12-34C", "vehicle_type": "Delivery Van", "max_weight": 3500, "mileage": 12800, "status": "on_trip"},
        {"plate_number": "CD56-78E", "vehicle_type": "Cargo Bike", "max_weight": 100, "mileage": 4500, "status": "in_shop"},
        {"plate_number": "MN99-11F", "vehicle_type": "Heavy Duty Truck", "max_weight": 25000, "mileage": 78200, "status": "available"},
        {"plate_number": "PQ77-55G", "vehicle_type": "Sprinter Van", "max_weight": 2000, "mileage": 21000, "status": "available"},
    ]
    vehicles = []
    for v in vehicles_data:
        vehicle = models.Vehicle(**v)
        db.add(vehicle)
        vehicles.append(vehicle)

    db.flush()  # flush to get IDs

    # ---- DRIVERS ----
    drivers_data = [
        {"name": "Robert Fox", "license_number": "LIC-9021", "license_expiry_date": datetime.date(2027, 12, 15), "safety_score": 94, "duty_status": "on", "avatar_url": "https://i.pravatar.cc/150?u=1"},
        {"name": "Cody Fisher", "license_number": "LIC-1102", "license_expiry_date": datetime.date(2024, 1, 10), "safety_score": 42, "duty_status": "suspended", "avatar_url": "https://i.pravatar.cc/150?u=2"},
        {"name": "Alice Johnson", "license_number": "LIC-3301", "license_expiry_date": datetime.date(2028, 6, 1), "safety_score": 88, "duty_status": "on", "avatar_url": "https://i.pravatar.cc/150?u=3"},
        {"name": "Marcus Rivera", "license_number": "LIC-4421", "license_expiry_date": datetime.date(2026, 3, 20), "safety_score": 76, "duty_status": "off", "avatar_url": "https://i.pravatar.cc/150?u=4"},
    ]
    drivers = []
    for d in drivers_data:
        driver = models.Driver(**d)
        db.add(driver)
        drivers.append(driver)

    db.flush()

    # ---- TRIPS ----
    trips_data = [
        {"vehicle": 0, "driver": 0, "destination": "Chicago, IL → Houston, TX", "cargo_weight": 12000, "status": "sent", "start": datetime.datetime.utcnow() - datetime.timedelta(hours=3)},
        {"vehicle": 1, "driver": 2, "destination": "Milwaukee, WI → Detroit, MI", "cargo_weight": 2500, "status": "done", "start": datetime.datetime.utcnow() - datetime.timedelta(days=1), "end": datetime.datetime.utcnow() - datetime.timedelta(hours=6)},
        {"vehicle": 3, "driver": 0, "destination": "Dallas, TX → Denver, CO", "cargo_weight": 18000, "status": "draft"},
    ]
    trips = []
    for td in trips_data:
        trip = models.Trip(
            vehicle_id=vehicles[td["vehicle"]].id,
            driver_id=drivers[td["driver"]].id,
            destination=td["destination"],
            cargo_weight=td["cargo_weight"],
            status=td["status"],
            start_time=td.get("start"),
            end_time=td.get("end"),
        )
        db.add(trip)
        trips.append(trip)

    db.flush()

    # ---- MAINTENANCE LOGS ----
    maintenance_data = [
        {"vehicle": 2, "description": "Hydraulic brake system failure — full replacement needed", "cost": 2840.0},
        {"vehicle": 1, "description": "Routine oil change and filter replacement", "cost": 320.0},
    ]
    for m in maintenance_data:
        log = models.MaintenanceLog(
            vehicle_id=vehicles[m["vehicle"]].id,
            description=m["description"],
            cost=m["cost"],
        )
        db.add(log)

    # ---- FUEL LOGS ----
    if len(trips) >= 2 and trips[1].id:
        fuel = models.FuelLog(
            trip_id=trips[1].id,
            fuel_used=185.0,
            fuel_cost=325.50,
        )
        db.add(fuel)

    db.commit()
    return {
        "msg": "Database seeded successfully!",
        "accounts": [
            {"email": "admin@fleetflow.com", "password": "admin123", "role": "Fleet Manager"},
            {"email": "dispatcher@fleetflow.com", "password": "admin123", "role": "Dispatcher"},
            {"email": "safety@fleetflow.com", "password": "admin123", "role": "Safety Officer"},
            {"email": "finance@fleetflow.com", "password": "admin123", "role": "Financial Analyst"},
        ]
    }


@app.post("/api/seed/reset", tags=["Dev"])
def reset_database(db: Session = Depends(get_db)):
    """Clear all data and re-seed. USE ONLY IN DEVELOPMENT."""
    db.query(models.FuelLog).delete()
    db.query(models.MaintenanceLog).delete()
    db.query(models.Trip).delete()
    db.query(models.Driver).delete()
    db.query(models.Vehicle).delete()
    db.query(models.User).delete()
    db.commit()
    return seed_database(db)


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "FleetFlow API v2",
        "status": "running",
        "docs": "/docs",
        "websocket": "ws://localhost:8001/ws",
    }
