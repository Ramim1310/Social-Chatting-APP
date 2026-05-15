const prisma = require('../config/db');

const searchUsers = async (req, res) => {
    const { query, userId } = req.body;
    if (!query) return res.json([]);
    try {
        const users = await prisma.user.findMany({
            where: {
                name: { contains: query, mode: 'insensitive' },
                AND: [{ id: { not: userId } }]
            },
            select: { id: true, name: true, email: true, image: true }
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Search failed" });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { friends: true }
        });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
};

const updateCurrentUser = async (req, res) => {
    const { name, image } = req.body;
    const updateData = {};
    if (name && name.trim()) updateData.name = name.trim();
    if (typeof image === 'string') updateData.image = image;
    try {
        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: updateData,
            include: { friends: true }
        });
        res.json(user);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to update profile" });
    }
};

const sendFriendRequest = async (req, res) => {
    const { senderId, receiverId } = req.body;
    if (senderId === receiverId) return res.status(400).json({ error: "Cannot send request to yourself" });

    try {
        const existing = await prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            }
        });
        if (existing) {
            if (existing.status === 'pending') return res.status(400).json({ error: "Request already pending" });
            if (existing.status === 'accepted') return res.status(400).json({ error: "Already friends" });
            return res.status(400).json({ error: "Request exists" });
        }

        const request = await prisma.friendRequest.create({
            data: { senderId, receiverId, status: 'pending' }
        });
        res.json(request);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to send request" });
    }
};

const getPendingRequests = async (req, res) => {
    const receiverId = parseInt(req.params.userId);
    if (isNaN(receiverId)) return res.status(400).json({ error: "Invalid user ID" });

    try {
        const requests = await prisma.friendRequest.findMany({
            where: { receiverId: receiverId, status: 'pending' },
            include: { sender: true }
        });
        res.json(requests);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
};

const acceptFriendRequest = async (req, res) => {
    const { requestId } = req.body;
    try {
        const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
        if (!request) return res.status(404).json({ error: "Request not found" });

        await prisma.$transaction([
            prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'accepted' } }),
            prisma.user.update({ where: { id: request.senderId }, data: { friends: { connect: { id: request.receiverId } } } }),
            prisma.user.update({ where: { id: request.receiverId }, data: { friends: { connect: { id: request.senderId } } } })
        ]);
        res.json({ message: "Accepted" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to accept" });
    }
};

const rejectFriendRequest = async (req, res) => {
    const { requestId } = req.body;
    try {
        await prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'rejected' } });
        res.json({ message: "Rejected" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to reject" });
    }
};

module.exports = {
    searchUsers, getCurrentUser, updateCurrentUser,
    sendFriendRequest, getPendingRequests, acceptFriendRequest, rejectFriendRequest
};
