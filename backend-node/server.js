require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Pass io to Express routes so they can emit events
app.set('io', io);

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// Socket.io Real-time connection
io.on('connection', (socket) => {
    console.log('Client connected: ' + socket.id);
    socket.emit('dashboardUpdate'); // Force initial refresh

    socket.on('disconnect', () => {
        console.log('Client disconnected: ' + socket.id);
    });
});

const PORT = process.env.PORT || 8001;

async function seedDatabase() {
    const adminExists = await prisma.user.findFirst({ where: { role: 'Fleet Manager' } });
    if (!adminExists) {
        const hashedPass = await bcrypt.hash('admin123', 10);
        await prisma.user.createMany({
            data: [
                { name: 'Admin Flow', email: 'admin@fleetflow.com', password: hashedPass, role: 'Fleet Manager' },
                { name: 'Dispatcher Dan', email: 'dispatcher@fleetflow.com', password: hashedPass, role: 'Dispatcher' },
                { name: 'Safety Sam', email: 'safety@fleetflow.com', password: hashedPass, role: 'Safety Officer' },
                { name: 'Finance Fay', email: 'finance@fleetflow.com', password: hashedPass, role: 'Financial Analyst' }
            ]
        });

        await prisma.vehicle.createMany({
            data: [
                { plateNumber: 'XY98-12A', type: 'Truck', maxWeight: 5000, mileage: 12500, status: 'available' },
                { plateNumber: 'AB12-34C', type: 'Van', maxWeight: 2000, mileage: 8200, status: 'on_trip' },
                { plateNumber: 'CD56-78E', type: 'Bike', maxWeight: 50, mileage: 4500, status: 'in_shop' }
            ]
        });

        await prisma.driver.createMany({
            data: [
                { name: 'John Doe', licenseNumber: 'LIC-123', licenseExpiryDate: new Date('2030-01-01'), safetyScore: 95, dutyStatus: 'available' },
                { name: 'Alice Smith', licenseNumber: 'LIC-456', licenseExpiryDate: new Date('2023-01-01'), safetyScore: 80, dutyStatus: 'off' } // expired
            ]
        });

        console.log('Database synced & seeded successfully!');
    }
}

server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        await seedDatabase();
    } catch (err) {
        console.log("Could not seed DB yet...", err.message);
    }
});
