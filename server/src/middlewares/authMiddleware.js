const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'SECRET_KEY', (err, user) => {
        if (err) {
            console.error(`[AUTH ERROR] Token verification failed: ${err.message}`);
            return res.sendStatus(401);
        }
        req.user = { userId: user.userId || user.id, email: user.email };
        next();
    });
}

module.exports = { authenticateToken };
