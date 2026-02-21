# FleetFlow Backend API Documentation

## Base URL
`http://localhost:8001`

## Real-Time Updates (WebSocket)
Connect to `ws://localhost:8001` via `socket.io-client`. Events emitted:
- `dashboardUpdate`: Emitted when any core entity changes (trips, vehicles, drivers, maintenance). Frontend should refresh data upon receiving this.
- `alert`: Emitted with error messages (e.g. `Expired License Attempt`, `Overweight Cargo Attempt`, `Vehicle sent to maintenance`).

## REST APIs
Include `Authorization: Bearer <your-jwt-token>` logic for protected routes.

### Auth
- `POST /auth/login` (Body: `email`, `password`) -> Returns `token`, `user`.
- `POST /auth/register` (Body: `name`, `email`, `password`, `role`)

*(Roles available: 'Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst')*

### Vehicles
- `GET /api/vehicles` (Roles: `Fleet Manager`, `Dispatcher`)
  *Note: Dyspatchers will not see vehicles in `in_shop` status.*
- `POST /api/vehicles` (Role: `Fleet Manager`)

### Drivers
- `GET /api/drivers` (Roles: `Fleet Manager`, `Safety Officer`, `Dispatcher`)
- `POST /api/drivers` (Roles: `Fleet Manager`, `Safety Officer`)

### Trips
- `GET /api/trips` (Roles: `Fleet Manager`, `Dispatcher`)
- `POST /api/trips` (Body: `vehicleId`, `driverId`, `cargoWeight`) (Roles: `Fleet Manager`, `Dispatcher`)
  *Validates Max Weight constraint, License Expiry, and Vehicle Status.*
- `PATCH /api/trips/:id/status` (Body: `status` string -> `sent`, `done`, `canceled`)
  *Automatically updates corresponding vehicle/driver availability and mileage when trip is marked `sent` or `done`.*

### Maintenance
- `POST /api/maintenance` (Body: `vehicleId`, `description`, `cost`) (Role: `Fleet Manager`)
  *Automatically sets vehicle status to `in_shop`.*

### Reports
- `GET /api/reports/fuel` (Roles: `Fleet Manager`, `Financial Analyst`)
  *Returns fuel report data mapped over vehicle and usage.*
