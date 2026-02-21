const jwt = require('jsonwebtoken');

const authMiddleware = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token provided, authorization denied' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersafesecretkey!');
            req.user = decoded;

            if (roles.length && !roles.includes(req.user.role)) {
                return res.status(403).json({ message: 'Unauthorized role' });
            }

            // Additional business logic lockout logic
            if (req.user.dutyStatus === 'suspended') {
                return res.status(403).json({ message: 'Account is suspended' });
            }

            next();
        } catch (error) {
            return res.status(401).json({ message: 'Token is not valid' });
        }
    };
};

module.exports = authMiddleware;
