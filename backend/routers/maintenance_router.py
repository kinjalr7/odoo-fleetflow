from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import require_roles
from websocket_manager import manager

router = APIRouter(prefix="/api/maintenance", tags=["Maintenance"])


@router.get("", response_model=List[schemas.MaintenanceResponse])
def get_maintenance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Safety Officer")),
):
    return db.query(models.MaintenanceLog).order_by(models.MaintenanceLog.created_at.desc()).all()


@router.post("", response_model=schemas.MaintenanceResponse, status_code=201)
async def create_maintenance(
    m: schemas.MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager")),
):
    """Log a maintenance entry and automatically set vehicle status to in_shop."""
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == m.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    log = models.MaintenanceLog(
        vehicle_id=m.vehicle_id,
        description=m.description,
        cost=m.cost,
    )
    db.add(log)

    # Business Rule: maintenance → vehicle goes in_shop
    previous_status = vehicle.status
    vehicle.status = "in_shop"
    db.commit()
    db.refresh(log)

    await manager.send_alert(
        "maintenance_status_change",
        f"Vehicle {vehicle.plate_number} sent to maintenance shop. Reason: {m.description[:60]}",
        "warning",
        vehicle.id,
    )
    await manager.broadcast("vehicleStatusUpdated", {
        "id": vehicle.id,
        "status": "in_shop",
        "plate_number": vehicle.plate_number,
        "previous_status": previous_status,
    })
    await manager.broadcast("dashboardUpdate", {})
    return log


@router.delete("/{log_id}", status_code=204)
async def delete_maintenance(
    log_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager")),
):
    log = db.query(models.MaintenanceLog).filter(models.MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")

    # When maintenance is deleted (resolved): put vehicle back to available
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == log.vehicle_id).first()
    if vehicle and vehicle.status == "in_shop":
        vehicle.status = "available"

    db.delete(log)
    db.commit()

    await manager.broadcast("dashboardUpdate", {})
    return None
