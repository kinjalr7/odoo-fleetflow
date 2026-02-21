import io
import csv
import datetime
from typing import List
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db
import models
import schemas
from auth import require_roles

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/fuel-efficiency", response_model=List[schemas.FuelEfficiencyReport])
def get_fuel_efficiency(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Financial Analyst")),
):
    """Fuel efficiency report: km/l and cost/km per trip."""
    fuel_logs = db.query(models.FuelLog).all()
    report = []

    for log in fuel_logs:
        trip = log.trip
        if not trip or not trip.vehicle:
            continue

        # Estimate distance from mileage delta (simplified: cargo * 0.01 km per kg heuristic)
        distance_est = trip.cargo_weight * 0.01 if trip.cargo_weight else 0
        efficiency = round(distance_est / log.fuel_used, 2) if log.fuel_used > 0 else None
        cost_per_km = round(log.fuel_cost / distance_est, 2) if distance_est > 0 else None

        report.append(schemas.FuelEfficiencyReport(
            trip_id=trip.id,
            vehicle_plate=trip.vehicle.plate_number,
            destination=trip.destination,
            fuel_used=log.fuel_used,
            fuel_cost=log.fuel_cost,
            efficiency_km_per_l=efficiency,
            cost_per_km=cost_per_km,
        ))

    return report


@router.get("/monthly-expenses")
def monthly_expenses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Financial Analyst")),
):
    """Monthly expense summary: maintenance + fuel costs."""
    result = []

    # Group maintenance logs by month
    maint_logs = db.query(models.MaintenanceLog).all()
    fuel_logs = db.query(models.FuelLog).all()

    monthly = {}

    for log in maint_logs:
        key = log.created_at.strftime("%Y-%m")
        monthly.setdefault(key, {"maintenance": 0, "fuel": 0})
        monthly[key]["maintenance"] += log.cost

    for log in fuel_logs:
        key = log.created_at.strftime("%Y-%m")
        monthly.setdefault(key, {"maintenance": 0, "fuel": 0})
        monthly[key]["fuel"] += log.fuel_cost

    for month_key, costs in sorted(monthly.items()):
        result.append({
            "month": month_key,
            "total_maintenance_cost": round(costs["maintenance"], 2),
            "total_fuel_cost": round(costs["fuel"], 2),
            "total_cost": round(costs["maintenance"] + costs["fuel"], 2),
        })

    return result


@router.get("/vehicle-profitability")
def vehicle_profitability(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Financial Analyst")),
):
    """Cost per vehicle: maintenance + fuel costs aggregated."""
    vehicles = db.query(models.Vehicle).all()
    result = []

    for v in vehicles:
        maint_cost = sum(m.cost for m in v.maintenance_logs)
        fuel_cost = sum(
            fl.fuel_cost
            for trip in v.trips
            for fl in trip.fuel_logs
        )
        total_cost = maint_cost + fuel_cost

        result.append({
            "vehicle_id": v.id,
            "plate_number": v.plate_number,
            "vehicle_type": v.vehicle_type,
            "total_mileage": v.mileage,
            "total_maintenance_cost": round(maint_cost, 2),
            "total_fuel_cost": round(fuel_cost, 2),
            "total_cost": round(total_cost, 2),
            "cost_per_km": round(total_cost / v.mileage, 2) if v.mileage > 0 else None,
        })

    return result


@router.get("/export/csv")
def export_csv(
    report: str = "fuel",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Financial Analyst")),
):
    """Export any report as CSV. ?report=fuel|expenses|profitability"""
    output = io.StringIO()
    writer = csv.writer(output)

    if report == "fuel":
        fuel_logs = db.query(models.FuelLog).all()
        writer.writerow(["Trip ID", "Vehicle Plate", "Destination", "Fuel Used (L)", "Fuel Cost ($)", "Efficiency (km/L)", "Cost/km"])
        for log in fuel_logs:
            trip = log.trip
            if not trip:
                continue
            dist = trip.cargo_weight * 0.01 if trip.cargo_weight else 0
            eff = round(dist / log.fuel_used, 2) if log.fuel_used > 0 else "N/A"
            cpk = round(log.fuel_cost / dist, 2) if dist > 0 else "N/A"
            writer.writerow([trip.id, trip.vehicle.plate_number if trip.vehicle else "-", trip.destination, log.fuel_used, log.fuel_cost, eff, cpk])

    elif report == "expenses":
        maint_logs = db.query(models.MaintenanceLog).all()
        writer.writerow(["Date", "Vehicle Plate", "Description", "Cost ($)"])
        for m in maint_logs:
            writer.writerow([m.created_at.strftime("%Y-%m-%d"), m.vehicle.plate_number if m.vehicle else "-", m.description, m.cost])

    elif report == "profitability":
        vehicles = db.query(models.Vehicle).all()
        writer.writerow(["Vehicle ID", "Plate", "Type", "Mileage (km)", "Maintenance Cost ($)", "Fuel Cost ($)", "Total Cost ($)", "Cost/km"])
        for v in vehicles:
            mc = sum(m.cost for m in v.maintenance_logs)
            fc = sum(fl.fuel_cost for trip in v.trips for fl in trip.fuel_logs)
            tc = mc + fc
            cpk = round(tc / v.mileage, 2) if v.mileage > 0 else "N/A"
            writer.writerow([v.id, v.plate_number, v.vehicle_type, v.mileage, round(mc, 2), round(fc, 2), round(tc, 2), cpk])

    output.seek(0)
    filename = f"fleetflow_{report}_{datetime.date.today()}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/pdf")
def export_pdf(
    report: str = "fuel",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Financial Analyst")),
):
    """Export any report as PDF."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
    styles = getSampleStyleSheet()
    elements = []

    title = f"FleetFlow Report — {report.capitalize()} — {datetime.date.today()}"
    elements.append(Paragraph(title, styles["Title"]))
    elements.append(Spacer(1, 12))

    if report == "fuel":
        fuel_logs = db.query(models.FuelLog).all()
        data = [["Trip ID", "Vehicle", "Destination", "Fuel Used (L)", "Fuel Cost ($)", "Efficiency"]]
        for log in fuel_logs:
            trip = log.trip
            if not trip:
                continue
            dist = trip.cargo_weight * 0.01 if trip.cargo_weight else 0
            eff = f"{round(dist / log.fuel_used, 2)} km/L" if log.fuel_used > 0 else "N/A"
            data.append([
                trip.id[:8] + "...",
                trip.vehicle.plate_number if trip.vehicle else "-",
                trip.destination[:25],
                log.fuel_used,
                f"${log.fuel_cost:.2f}",
                eff,
            ])

    elif report == "expenses":
        maint = db.query(models.MaintenanceLog).all()
        data = [["Date", "Vehicle", "Description", "Cost ($)"]]
        for m in maint:
            data.append([
                m.created_at.strftime("%Y-%m-%d"),
                m.vehicle.plate_number if m.vehicle else "-",
                m.description[:40],
                f"${m.cost:.2f}",
            ])

    elif report == "profitability":
        vehicles = db.query(models.Vehicle).all()
        data = [["Plate", "Type", "Mileage (km)", "Maintenance ($)", "Fuel ($)", "Total ($)", "Cost/km"]]
        for v in vehicles:
            mc = sum(m.cost for m in v.maintenance_logs)
            fc = sum(fl.fuel_cost for trip in v.trips for fl in trip.fuel_logs)
            tc = mc + fc
            cpk = f"${round(tc / v.mileage, 2)}" if v.mileage > 0 else "N/A"
            data.append([v.plate_number, v.vehicle_type, v.mileage, f"${mc:.2f}", f"${fc:.2f}", f"${tc:.2f}", cpk])
    else:
        data = [["No data"]]

    table = Table(data)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d0d7de")),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    filename = f"fleetflow_{report}_{datetime.date.today()}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/alerts")
def get_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("Fleet Manager", "Safety Officer", "Dispatcher")),
):
    """Return current active alerts: expired licenses, overweight risks, vehicles in shop."""
    alerts = []
    today = datetime.date.today()
    warning_threshold = today + datetime.timedelta(days=30)

    drivers = db.query(models.Driver).all()
    for d in drivers:
        if d.license_expiry_date <= today:
            alerts.append({
                "type": "license_expired",
                "message": f"Driver {d.name}'s license EXPIRED on {d.license_expiry_date}",
                "severity": "critical",
                "entity_id": d.id,
            })
        elif d.license_expiry_date <= warning_threshold:
            alerts.append({
                "type": "license_expiring",
                "message": f"Driver {d.name}'s license expires on {d.license_expiry_date}",
                "severity": "warning",
                "entity_id": d.id,
            })

    shop_vehicles = db.query(models.Vehicle).filter(models.Vehicle.status == "in_shop").all()
    for v in shop_vehicles:
        alerts.append({
            "type": "vehicle_in_shop",
            "message": f"Vehicle {v.plate_number} is currently in maintenance shop",
            "severity": "info",
            "entity_id": v.id,
        })

    return alerts
