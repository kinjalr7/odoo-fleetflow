const { Sequelize } = require('sequelize');

// If the user wants PostgreSQL, they can change the dialect to 'postgres'
// and provide the connection string in DB_URL environment variable.
// Example: new Sequelize(process.env.DB_URL, { dialect: 'postgres' });
// For now, we use SQLite to ensure it works identically out of the box.

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './fleetflow.sqlite',
    logging: false,
});

module.exports = sequelize;
