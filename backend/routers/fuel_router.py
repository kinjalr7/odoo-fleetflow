from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import require_roles

router = APIRouter(prefix="/api/fuel", tags=["Fuel Logs"])


@router.get("", response_model=List[schemas.FuelLogResponse])
def get_fuel_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Financial Analyst")),
):
    return db.query(models.FuelLog).order_by(models.FuelLog.created_at.desc()).all()


@router.post("", response_model=schemas.FuelLogResponse, status_code=201)
def create_fuel_log(
    f: schemas.FuelLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Dispatcher")),
):
    from fastapi import HTTPException
    trip = db.query(models.Trip).filter(models.Trip.id == f.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    log = models.FuelLog(**f.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
