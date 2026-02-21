const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

const getIo = (req) => req.app.get('io');

// ==========================
// VEHICLES (Fleet Manager, Dispatcher)
// ==========================
router.get('/vehicles', auth(['Fleet Manager', 'Dispatcher']), async (req, res) => {
    try {
        const vehicles = await prisma.vehicle.findMany();

        // Vehicle in shop MUST be hidden from dispatcher
        let filteredVehicles = vehicles;
        if (req.user.role === 'Dispatcher') {
            filteredVehicles = vehicles.filter(v => v.status !== 'in_shop');
        }

        res.json(filteredVehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/vehicles', auth(['Fleet Manager']), async (req, res) => {
    try {
        const vehicle = await prisma.vehicle.create({ data: req.body });
        getIo(req).emit('dashboardUpdate');
        res.status(201).json(vehicle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================
// DRIVERS (Fleet Manager, Safety Officer)
// ==========================
router.get('/drivers', auth(['Fleet Manager', 'Safety Officer', 'Dispatcher']), async (req, res) => {
    try {
        const drivers = await prisma.driver.findMany();
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/drivers', auth(['Fleet Manager', 'Safety Officer']), async (req, res) => {
    try {
        req.body.licenseExpiryDate = new Date(req.body.licenseExpiryDate);
        const driver = await prisma.driver.create({ data: req.body });
        getIo(req).emit('dashboardUpdate');
        res.status(201).json(driver);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================
// TRIPS (Fleet Manager, Dispatcher)
// ==========================
router.get('/trips', auth(['Fleet Manager', 'Dispatcher']), async (req, res) => {
    try {
        const trips = await prisma.trip.findMany({
            include: { Vehicle: true, Driver: true }
        });
        res.json(trips);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/trips', auth(['Fleet Manager', 'Dispatcher']), async (req, res) => {
    try {
        const { vehicleId, driverId, cargoWeight } = req.body;

        // Validations
        const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
        const driver = await prisma.driver.findUnique({ where: { id: driverId } });

        if (!vehicle || !driver) return res.status(404).json({ message: 'Vehicle or Driver not found' });

        // Business Logic
        if (cargoWeight > vehicle.maxWeight) {
            getIo(req).emit('alert', `Overweight Cargo Attempt: ${cargoWeight}kg on vehicle ${vehicle.plateNumber}`);
            return res.status(400).json({ message: 'Cargo weight exceeds vehicle max weight' });
        }

        if (vehicle.status !== 'available') {
            return res.status(400).json({ message: 'Vehicle is not available' });
        }

        if (new Date(driver.licenseExpiryDate) < new Date()) {
            getIo(req).emit('alert', `Expired License Attempt: Driver ${driver.name}`);
            return res.status(400).json({ message: 'Driver license is expired' });
        }

        const trip = await prisma.trip.create({
            data: { vehicleId, driverId, cargoWeight }
        });

        getIo(req).emit('dashboardUpdate');
        res.status(201).json(trip);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/trips/:id/status', auth(['Fleet Manager', 'Dispatcher']), async (req, res) => {
    try {
        const { status } = req.body; // sent, done, canceled
        let trip = await prisma.trip.findUnique({ where: { id: req.params.id } });

        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        if (status === 'sent') {
            await prisma.vehicle.update({ where: { id: trip.vehicleId }, data: { status: 'on_trip' } });
            await prisma.driver.update({ where: { id: trip.driverId }, data: { dutyStatus: 'on_trip' } });
            trip = await prisma.trip.update({ where: { id: req.params.id }, data: { status, startTime: new Date() } });
        } else if (status === 'done') {
            await prisma.vehicle.update({
                where: { id: trip.vehicleId },
                data: { status: 'available', mileage: { increment: 100 } } // Mock 100 mileage added automatically
            });
            await prisma.driver.update({ where: { id: trip.driverId }, data: { dutyStatus: 'available' } });
            trip = await prisma.trip.update({ where: { id: req.params.id }, data: { status, endTime: new Date() } });
        } else {
            trip = await prisma.trip.update({ where: { id: req.params.id }, data: { status } });
        }

        getIo(req).emit('dashboardUpdate');
        res.json(trip);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================
// MAINTENANCE (Fleet Manager)
// ==========================
router.post('/maintenance', auth(['Fleet Manager']), async (req, res) => {
    try {
        const { vehicleId, description, cost } = req.body;

        const log = await prisma.maintenanceLog.create({
            data: { vehicleId, description, cost }
        });

        await prisma.vehicle.update({
            where: { id: vehicleId },
            data: { status: 'in_shop' }
        });

        getIo(req).emit('alert', 'Vehicle sent to maintenance');
        getIo(req).emit('dashboardUpdate');

        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================
// REPORTS (Financial Analyst, Fleet Manager)
// ==========================
router.get('/reports/fuel', auth(['Fleet Manager', 'Financial Analyst']), async (req, res) => {
    try {
        const fuelLogs = await prisma.fuelLog.findMany({ include: { Trip: { include: { Vehicle: true } } } });

        // simple report mapped
        const report = fuelLogs.map(log => ({
            tripId: log.tripId,
            vehiclePlate: log.Trip?.Vehicle?.plateNumber,
            fuelUsed: log.fuelUsed,
            fuelCost: log.fuelCost,
            efficiency: log.fuelUsed ? (100 / log.fuelUsed).toFixed(2) : 0 // assuming 100 miles
        }));

        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
