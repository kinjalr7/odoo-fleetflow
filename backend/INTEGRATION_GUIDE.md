# FleetFlow — Python Backend Integration Guide

## Architecture

```
frontend (React/Vite)   :5173  ──── REST/WebSocket ──── backend (FastAPI) :8001
                                              │
                                         SQLite DB (fleetflow.db)
```

## Starting the Backend

```bash
cd backend
./start_backend.sh
# OR manually:
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## Database Seeding (First Run)

The database is seeded automatically once (on first `/api/seed`). 
After starting the server, seed via:
```bash
curl -X POST http://localhost:8001/api/seed
```

To reset: `curl -X POST http://localhost:8001/api/seed/reset`

---

## Demo Accounts (password: `admin123`)

| Email | Role | Access |
|-------|------|--------|
| admin@fleetflow.com | Fleet Manager | Full access |
| dispatcher@fleetflow.com | Dispatcher | Trips & vehicles (no in_shop) |
| safety@fleetflow.com | Safety Officer | Drivers & maintenance |
| finance@fleetflow.com | Financial Analyst | Reports & fuel logs |

---

## Authentication

All protected endpoints require:
```
Authorization: Bearer <JWT_token>
```

### Login
```http
POST /auth/login
Content-Type: application/json

{ "email": "admin@fleetflow.com", "password": "admin123" }
```

**Response:**
```json
{
  "token": "<access_jwt>",
  "refresh_token": "<refresh_jwt>",
  "name": "Admin Flow",
  "email": "admin@fleetflow.com",
  "role": "Fleet Manager",
  "user_id": "..."
}
```

### Refresh Token
```http
POST /auth/refresh
{ "refresh_token": "<refresh_jwt>" }
```

---

## API Endpoints Summary

### Dashboard
| Method | Endpoint | Roles
|--------|----------|------
| GET | `/api/stats` | All roles

### Vehicles
| Method | Endpoint | Roles |
|--------|----------|-------|
| GET | `/api/vehicles` | Fleet Manager, Dispatcher (no in_shop for Dispatcher) |
| POST | `/api/vehicles` | Fleet Manager only |
| PATCH | `/api/vehicles/{id}` | Fleet Manager only |
| DELETE | `/api/vehicles/{id}` | Fleet Manager only (soft delete → retired) |

### Drivers
| Method | Endpoint | Roles |
|--------|----------|-------|
| GET | `/api/drivers` | Fleet Manager, Dispatcher, Safety Officer |
| POST | `/api/drivers` | Fleet Manager, Safety Officer |
| PATCH | `/api/drivers/{id}` | Fleet Manager, Safety Officer |
| DELETE | `/api/drivers/{id}` | Fleet Manager (sets to suspended) |

### Trips
| Method | Endpoint | Roles |
|--------|----------|-------|
| GET | `/api/trips` | Fleet Manager, Dispatcher |
| POST | `/api/trips` | Fleet Manager, Dispatcher |
| PATCH | `/api/trips/{id}/status` | Fleet Manager, Dispatcher |
| DELETE | `/api/trips/{id}` | Fleet Manager |

**Trip status values:** `draft` → `sent` → `done` or `canceled`

### Maintenance
| Method | Endpoint | Roles |
|--------|----------|-------|
| GET | `/api/maintenance` | Fleet Manager, Safety Officer |
| POST | `/api/maintenance` | Fleet Manager |
| DELETE | `/api/maintenance/{id}` | Fleet Manager (resolves, sets vehicle → available) |

### Fuel Logs
| Method | Endpoint | Roles |
|--------|----------|-------|
| GET | `/api/fuel` | Fleet Manager, Financial Analyst |
| POST | `/api/fuel` | Fleet Manager, Dispatcher |

### Reports
| Method | Endpoint | Roles |
|--------|----------|-------|
| GET | `/api/reports/fuel-efficiency` | Fleet Manager, Financial Analyst |
| GET | `/api/reports/monthly-expenses` | Fleet Manager, Financial Analyst |
| GET | `/api/reports/vehicle-profitability` | Fleet Manager, Financial Analyst |
| GET | `/api/reports/alerts` | Fleet Manager, Safety Officer, Dispatcher |
| GET | `/api/reports/export/csv?report=fuel` | Fleet Manager, Financial Analyst |
| GET | `/api/reports/export/pdf?report=fuel` | Fleet Manager, Financial Analyst |

Report types: `fuel`, `expenses`, `profitability`

---

## Business Rules (Enforced by Backend)

1. **Overweight**: `cargo_weight > vehicle.max_weight` → trip blocked, alert broadcast
2. **Vehicle unavailable**: `vehicle.status != "available"` → trip blocked
3. **Expired license**: `driver.license_expiry_date < today` → trip blocked, alert broadcast
4. **Driver off duty**: `driver.duty_status != "on"` → trip blocked
5. **Trip sent**: Vehicle + driver set to `on_trip`
6. **Trip done**: Vehicle + driver returned to `available`, mileage auto-updated
7. **Maintenance created**: Vehicle status → `in_shop`, alert broadcast
8. **Maintenance resolved**: Vehicle status → `available`

---

## WebSocket Events

Connect via: `ws://localhost:8001/ws`

Events received from server:
```json
{ "event": "dashboardUpdate", "data": { ...stats } }
{ "event": "vehicleCreated", "data": { ...vehicle } }
{ "event": "vehicleStatusUpdated", "data": { ...vehicle } }
{ "event": "tripStatusUpdated", "data": { "trip_id": "...", "status": "..." } }
{ "event": "alert", "data": { "type": "...", "message": "...", "severity": "critical|warning|info", "entity_id": "..." } }
```

---

## Swagger UI

Full interactive API documentation available at:
**http://localhost:8001/docs**
