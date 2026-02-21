import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import require_roles
from websocket_manager import manager

router = APIRouter(prefix="/api/trips", tags=["Trips"])


def build_stats(db: Session) -> dict:
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


@router.get("", response_model=List[schemas.TripResponse])
def get_trips(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Dispatcher")),
):
    trips = db.query(models.Trip).order_by(models.Trip.created_at.desc()).all()
    return trips


@router.post("", response_model=schemas.TripResponse, status_code=201)
async def create_trip(
    t: schemas.TripCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Dispatcher")),
):
    """Create a trip with full business rule validation."""
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == t.vehicle_id).first()
    driver = db.query(models.Driver).filter(models.Driver.id == t.driver_id).first()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Business Rule: cargo weight check
    if t.cargo_weight > vehicle.max_weight:
        await manager.send_alert(
            "overweight_cargo",
            f"Overweight attempt: {t.cargo_weight}kg on {vehicle.plate_number} (max {vehicle.max_weight}kg)",
            "critical",
            vehicle.id,
        )
        raise HTTPException(
            status_code=400,
            detail=f"Cargo weight ({t.cargo_weight}kg) exceeds vehicle max capacity ({vehicle.max_weight}kg)",
        )

    # Business Rule: vehicle must be available
    if vehicle.status != "available":
        raise HTTPException(
            status_code=400,
            detail=f"Vehicle is not available. Current status: {vehicle.status}",
        )

    # Business Rule: driver license must not be expired
    if driver.license_expiry_date < datetime.date.today():
        await manager.send_alert(
            "expired_license",
            f"Trip blocked: {driver.name}'s license expired on {driver.license_expiry_date}",
            "critical",
            driver.id,
        )
        raise HTTPException(
            status_code=400,
            detail=f"Driver {driver.name}'s license has expired on {driver.license_expiry_date}",
        )

    # Business Rule: driver must be on duty
    if driver.duty_status != "on":
        raise HTTPException(
            status_code=400,
            detail=f"Driver {driver.name} is not on duty. Status: {driver.duty_status}",
        )

    trip = models.Trip(
        vehicle_id=t.vehicle_id,
        driver_id=t.driver_id,
        destination=t.destination,
        cargo_weight=t.cargo_weight,
        status="draft",
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    await manager.broadcast("dashboardUpdate", build_stats(db))
    return trip


@router.patch("/{trip_id}/status", response_model=schemas.TripResponse)
async def update_trip_status(
    trip_id: str,
    body: schemas.TripStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Dispatcher")),
):
    """Update trip status. Drives vehicle/driver availability automatically."""
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    new_status = body.status.lower()
    allowed = ["draft", "sent", "done", "canceled"]
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {allowed}")

    if new_status == "sent":
        # Trip starts: vehicle and driver become on_trip
        trip.start_time = datetime.datetime.utcnow()
        if trip.vehicle:
            trip.vehicle.status = "on_trip"
        if trip.driver:
            trip.driver.duty_status = "on_trip"

    elif new_status == "done":
        # Trip ends: vehicle + driver back to available, mileage auto-updated
        trip.end_time = datetime.datetime.utcnow()
        if trip.vehicle:
            # auto update mileage based on cargo/time (simple estimate)
            mileage_estimate = trip.cargo_weight * 0.01  # simplified: 0.01km per kg
            trip.vehicle.mileage = (trip.vehicle.mileage or 0) + mileage_estimate
            trip.vehicle.status = "available"
        if trip.driver:
            trip.driver.duty_status = "on"

    elif new_status == "canceled":
        # Cancel: release vehicle and driver if they were reserved
        if trip.vehicle and trip.vehicle.status == "on_trip":
            trip.vehicle.status = "available"
        if trip.driver and trip.driver.duty_status == "on_trip":
            trip.driver.duty_status = "on"

    trip.status = new_status
    db.commit()
    db.refresh(trip)

    await manager.broadcast("tripStatusUpdated", {"trip_id": trip.id, "status": new_status})
    await manager.broadcast("dashboardUpdate", build_stats(db))
    return trip


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager")),
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    db.delete(trip)
    db.commit()
    await manager.broadcast("dashboardUpdate", {})
    return None
