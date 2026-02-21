const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: {
        type: DataTypes.ENUM('Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst'),
        allowNull: false
    }
});

const Vehicle = sequelize.define('Vehicle', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    plate: { type: DataTypes.STRING, unique: true, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    maxWeight: { type: DataTypes.FLOAT, allowNull: false },
    mileage: { type: DataTypes.FLOAT, defaultValue: 0 },
    status: {
        type: DataTypes.ENUM('Available', 'In Transit', 'In Shop'),
        defaultValue: 'Available'
    }
});

const Driver = sequelize.define('Driver', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    licenseExpiry: { type: DataTypes.DATE, allowNull: false },
    safetyScore: { type: DataTypes.FLOAT, defaultValue: 100 },
    dutyStatus: {
        type: DataTypes.ENUM('Available', 'On Duty', 'Off Duty'),
        defaultValue: 'Available'
    }
});

const Trip = sequelize.define('Trip', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    destination: { type: DataTypes.STRING, allowNull: false },
    cargoWeight: { type: DataTypes.FLOAT, allowNull: false },
    status: {
        type: DataTypes.ENUM('Draft', 'Sent', 'Done', 'Canceled'),
        defaultValue: 'Draft'
    }
});

const MaintenanceLog = sequelize.define('MaintenanceLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    description: { type: DataTypes.STRING, allowNull: false },
    cost: { type: DataTypes.FLOAT, allowNull: false },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

const FuelLog = sequelize.define('FuelLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fuelUsed: { type: DataTypes.FLOAT, allowNull: false },
    fuelCost: { type: DataTypes.FLOAT, allowNull: false },
    date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Relationships
Vehicle.hasMany(Trip, { foreignKey: 'vehicleId' });
Trip.belongsTo(Vehicle, { foreignKey: 'vehicleId' });

Driver.hasMany(Trip, { foreignKey: 'driverId' });
Trip.belongsTo(Driver, { foreignKey: 'driverId' });

Vehicle.hasMany(MaintenanceLog, { foreignKey: 'vehicleId' });
MaintenanceLog.belongsTo(Vehicle, { foreignKey: 'vehicleId' });

Trip.hasMany(FuelLog, { foreignKey: 'tripId' });
FuelLog.belongsTo(Trip, { foreignKey: 'tripId' });

module.exports = { sequelize, User, Vehicle, Driver, Trip, MaintenanceLog, FuelLog };
