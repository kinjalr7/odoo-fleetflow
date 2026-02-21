import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user, require_roles
from websocket_manager import manager

router = APIRouter(prefix="/api/vehicles", tags=["Vehicles"])


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


def vehicle_to_dict(v: models.Vehicle) -> dict:
    return {
        "id": v.id,
        "plate_number": v.plate_number,
        "vehicle_type": v.vehicle_type,
        "max_weight": v.max_weight,
        "mileage": v.mileage,
        "status": v.status,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }


@router.get("", response_model=List[schemas.VehicleResponse])
def get_vehicles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Dispatcher")),
):
    """Get all vehicles. Dispatchers do NOT see in_shop vehicles."""
    vehicles = db.query(models.Vehicle).all()
    if current_user.role == "Dispatcher":
        vehicles = [v for v in vehicles if v.status != "in_shop"]
    return vehicles


@router.post("", response_model=schemas.VehicleResponse, status_code=201)
async def create_vehicle(
    v: schemas.VehicleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager")),
):
    """Create a new vehicle. Fleet Manager only."""
    existing = db.query(models.Vehicle).filter(models.Vehicle.plate_number == v.plate_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="A vehicle with this plate number already exists")

    vehicle = models.Vehicle(**v.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    await manager.broadcast("vehicleCreated", vehicle_to_dict(vehicle))
    await manager.broadcast("dashboardUpdate", build_stats(db))
    return vehicle


@router.patch("/{vehicle_id}", response_model=schemas.VehicleResponse)
async def update_vehicle(
    vehicle_id: str,
    update: schemas.VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager")),
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, value)

    db.commit()
    db.refresh(vehicle)

    await manager.broadcast("vehicleStatusUpdated", vehicle_to_dict(vehicle))
    await manager.broadcast("dashboardUpdate", build_stats(db))
    return vehicle


@router.delete("/{vehicle_id}", status_code=204)
async def delete_vehicle(
    vehicle_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager")),
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Soft-delete: mark as retired
    vehicle.status = "retired"
    db.commit()

    await manager.broadcast("dashboardUpdate", build_stats(db))
    return None
