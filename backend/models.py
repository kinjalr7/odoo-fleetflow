import uuid
import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Date, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Dispatcher")  # Fleet Manager, Dispatcher, Safety Officer, Financial Analyst
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(String, primary_key=True, default=generate_uuid)
    plate_number = Column(String, unique=True, nullable=False)
    vehicle_type = Column(String, nullable=False)   # Truck, Van, Bike, Semi-Truck
    max_weight = Column(Float, nullable=False)       # kg
    mileage = Column(Float, default=0)              # km
    status = Column(String, default="available")    # available, on_trip, in_shop, retired
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    trips = relationship("Trip", back_populates="vehicle")
    maintenance_logs = relationship("MaintenanceLog", back_populates="vehicle")


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    license_number = Column(String, unique=True, nullable=False)
    license_expiry_date = Column(Date, nullable=False)
    safety_score = Column(Float, default=100)
    duty_status = Column(String, default="on")   # on, off, suspended
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    trips = relationship("Trip", back_populates="driver")


class Trip(Base):
    __tablename__ = "trips"

    id = Column(String, primary_key=True, default=generate_uuid)
    vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(String, ForeignKey("drivers.id"), nullable=False)
    destination = Column(String, nullable=False)
    cargo_weight = Column(Float, nullable=False)    # kg
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    status = Column(String, default="draft")        # draft, sent, done, canceled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="trips")
    driver = relationship("Driver", back_populates="trips")
    fuel_logs = relationship("FuelLog", back_populates="trip")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=False)
    description = Column(Text, nullable=False)
    cost = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="maintenance_logs")


class FuelLog(Base):
    __tablename__ = "fuel_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    trip_id = Column(String, ForeignKey("trips.id"), nullable=False)
    fuel_used = Column(Float, nullable=False)   # liters
    fuel_cost = Column(Float, nullable=False)   # currency
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    trip = relationship("Trip", back_populates="fuel_logs")
