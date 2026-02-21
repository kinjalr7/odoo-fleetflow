import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import require_roles
from websocket_manager import manager

router = APIRouter(prefix="/api/drivers", tags=["Drivers"])


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


def driver_to_dict(d: models.Driver) -> dict:
    return {
        "id": d.id,
        "name": d.name,
        "license_number": d.license_number,
        "license_expiry_date": str(d.license_expiry_date),
        "safety_score": d.safety_score,
        "duty_status": d.duty_status,
        "avatar_url": d.avatar_url,
    }


@router.get("", response_model=List[schemas.DriverResponse])
async def get_drivers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Dispatcher", "Safety Officer")),
):
    """Get all drivers. Real-time license expiry alerts are broadcast if detected."""
    drivers = db.query(models.Driver).all()

    # Broadcast alerts for expiring/expired licenses
    today = datetime.date.today()
    warning_threshold = today + datetime.timedelta(days=30)
    for driver in drivers:
        if driver.license_expiry_date <= today:
            await manager.send_alert(
                "license_expired",
                f"Driver {driver.name}'s license has EXPIRED on {driver.license_expiry_date}",
                "critical",
                driver.id,
            )
        elif driver.license_expiry_date <= warning_threshold:
            await manager.send_alert(
                "license_expiring",
                f"Driver {driver.name}'s license expires on {driver.license_expiry_date}",
                "warning",
                driver.id,
            )

    return drivers


@router.post("", response_model=schemas.DriverResponse, status_code=201)
async def create_driver(
    d: schemas.DriverCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Safety Officer")),
):
    existing = db.query(models.Driver).filter(models.Driver.license_number == d.license_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="A driver with this license number already exists")

    driver = models.Driver(**d.model_dump())
    db.add(driver)
    db.commit()
    db.refresh(driver)

    await manager.broadcast("dashboardUpdate", build_stats(db))
    return driver


@router.patch("/{driver_id}", response_model=schemas.DriverResponse)
async def update_driver(
    driver_id: str,
    update: schemas.DriverUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Safety Officer")),
):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(driver, field, value)

    db.commit()
    db.refresh(driver)

    await manager.broadcast("dashboardUpdate", build_stats(db))
    return driver


@router.delete("/{driver_id}", status_code=204)
async def delete_driver(
    driver_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager")),
):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    driver.duty_status = "suspended"
    db.commit()
    await manager.broadcast("dashboardUpdate", build_stats(db))
    return None
