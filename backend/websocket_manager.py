"""
WebSocket connection manager for real-time broadcasts.
All connected clients receive live updates on fleet events.
"""
import json
import asyncio
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, event: str, data: dict = None):
        """Broadcast an event with optional payload to all connected clients."""
        message = json.dumps({"event": event, "data": data or {}})
        dead = set()
        for ws in self.active_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active_connections.discard(ws)

    async def send_alert(self, alert_type: str, message: str, severity: str, entity_id: str):
        await self.broadcast("alert", {
            "type": alert_type,
            "message": message,
            "severity": severity,
            "entity_id": entity_id,
        })

    async def dashboard_update(self, stats: dict):
        await self.broadcast("dashboardUpdate", stats)

    async def vehicle_updated(self, vehicle: dict):
        await self.broadcast("vehicleStatusUpdated", vehicle)

    async def trip_updated(self, trip: dict):
        await self.broadcast("tripStatusUpdated", trip)


# Global singleton manager
manager = ConnectionManager()
