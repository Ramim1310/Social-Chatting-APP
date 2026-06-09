const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');


const generateAccessToken = (user) => {
    return jwt.sign({ userId: user.id, email: user.email }, process.env.ACCESS_TOKEN_SECRET || 'SECRET_KEY', { expiresIn: '15m' });
};

const generateRefreshToken = (user) => {
    return jwt.sign({ userId: user.id, email: user.email }, process.env.REFRESH_TOKEN_SECRET || 'REFRESH_SECRET_KEY', { expiresIn: '7d' });
};

const cookieConfig = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

const register = async (req, res) => {
    const { name, email, password, image } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, image },
            include: { friends: true }
        });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.cookie('refreshToken', refreshToken, cookieConfig);
        res.json({ message: "Success", user, token: accessToken });
    } catch (error) {
        if (error.code === 'P2002') {
            const field = error.meta?.target?.[0] || 'Field';
            return res.status(400).json({ error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` });
        }
        console.error(error);
        res.status(500).json({ error: 'Error registering user' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { friends: true }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid password' });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        res.cookie('refreshToken', refreshToken, cookieConfig);
        res.json({ message: "Success", user, token: accessToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error logging in' });
    }
};

const refreshToken = (req, res) => {
    const rToken = req.cookies['refreshToken'];
    if (!rToken) return res.sendStatus(401);

    jwt.verify(rToken, process.env.REFRESH_TOKEN_SECRET || 'REFRESH_SECRET_KEY', (err, user) => {
        if (err) return res.sendStatus(403);
        const parsedId = user.userId || user.id;
        const newAccessToken = jwt.sign({ userId: parsedId, email: user.email }, process.env.ACCESS_TOKEN_SECRET || 'SECRET_KEY', { expiresIn: '15m' });
        res.json({ accessToken: newAccessToken });
    });
};

module.exports = { register, login, refreshToken };
