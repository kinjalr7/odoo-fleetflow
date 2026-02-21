from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import date, datetime


# =====================
#  AUTH SCHEMAS
# =====================

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "Dispatcher"

class TokenResponse(BaseModel):
    token: str
    refresh_token: str
    name: str
    email: str
    role: str
    user_id: str

class RefreshRequest(BaseModel):
    refresh_token: str


# =====================
#  USER SCHEMAS
# =====================

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


# =====================
#  VEHICLE SCHEMAS
# =====================

class VehicleCreate(BaseModel):
    plate_number: str
    vehicle_type: str
    max_weight: float
    mileage: float = 0
    status: str = "available"

class VehicleUpdate(BaseModel):
    plate_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    max_weight: Optional[float] = None
    mileage: Optional[float] = None
    status: Optional[str] = None

class VehicleResponse(BaseModel):
    id: str
    plate_number: str
    vehicle_type: str
    max_weight: float
    mileage: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# =====================
#  DRIVER SCHEMAS
# =====================

class DriverCreate(BaseModel):
    name: str
    license_number: str
    license_expiry_date: date
    safety_score: float = 100
    duty_status: str = "on"
    avatar_url: Optional[str] = None

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry_date: Optional[date] = None
    safety_score: Optional[float] = None
    duty_status: Optional[str] = None
    avatar_url: Optional[str] = None

class DriverResponse(BaseModel):
    id: str
    name: str
    license_number: str
    license_expiry_date: date
    safety_score: float
    duty_status: str
    avatar_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# =====================
#  TRIP SCHEMAS
# =====================

class TripCreate(BaseModel):
    vehicle_id: str
    driver_id: str
    destination: str
    cargo_weight: float

class TripStatusUpdate(BaseModel):
    status: str   # draft, sent, done, canceled

class TripVehicle(BaseModel):
    id: str
    plate_number: str
    vehicle_type: str

    class Config:
        from_attributes = True

class TripDriver(BaseModel):
    id: str
    name: str
    avatar_url: Optional[str]

    class Config:
        from_attributes = True

class TripResponse(BaseModel):
    id: str
    vehicle_id: str
    driver_id: str
    destination: str
    cargo_weight: float
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    status: str
    created_at: datetime
    vehicle: Optional[TripVehicle]
    driver: Optional[TripDriver]

    class Config:
        from_attributes = True


# =====================
#  MAINTENANCE SCHEMAS
# =====================

class MaintenanceCreate(BaseModel):
    vehicle_id: str
    description: str
    cost: float

class MaintenanceResponse(BaseModel):
    id: str
    vehicle_id: str
    description: str
    cost: float
    created_at: datetime

    class Config:
        from_attributes = True


# =====================
#  FUEL LOG SCHEMAS
# =====================

class FuelLogCreate(BaseModel):
    trip_id: str
    fuel_used: float
    fuel_cost: float

class FuelLogResponse(BaseModel):
    id: str
    trip_id: str
    fuel_used: float
    fuel_cost: float
    created_at: datetime

    class Config:
        from_attributes = True


# =====================
#  STATS / DASHBOARD
# =====================

class DashboardStats(BaseModel):
    active_vehicles: int
    maintenance_alerts: int
    idle_vehicles: int
    pending_shipments: int
    total_drivers: int
    suspended_drivers: int


# =====================
#  REPORTS
# =====================

class FuelEfficiencyReport(BaseModel):
    trip_id: str
    vehicle_plate: str
    destination: str
    fuel_used: float
    fuel_cost: float
    efficiency_km_per_l: Optional[float]
    cost_per_km: Optional[float]

class MonthlyExpenseReport(BaseModel):
    month: str
    total_maintenance_cost: float
    total_fuel_cost: float
    total_cost: float

class AlertResponse(BaseModel):
    type: str
    message: str
    severity: str
    entity_id: str
