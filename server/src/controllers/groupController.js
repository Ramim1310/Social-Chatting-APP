const prisma = require('../config/db');

const createGroup = async (req, res) => {
    const { name, memberIds } = req.body;
    const userId = req.user.userId;

    if (!name?.trim() || !Array.isArray(memberIds)) {
        return res.status(400).json({ error: 'Group name and memberIds array are required.' });
    }

    try {
        const parsedMemberIds = memberIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        const finalMemberIds = Array.from(new Set([...parsedMemberIds, parseInt(userId, 10)]));

        const group = await prisma.group.create({
            data: {
                name: name.trim(),
                creatorId: userId,
                members: { connect: finalMemberIds.map(id => ({ id })) }
            },
            include: {
                members: { select: { id: true, name: true, image: true } }
            }
        });

        res.status(201).json(group);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create group.' });
    }
};

const getGroups = async (req, res) => {
    const userId = req.user.userId;
    try {
        const groups = await prisma.group.findMany({
            where: { members: { some: { id: userId } } },
            include: { members: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(groups);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch groups.' });
    }
};

module.exports = { createGroup, getGroups };
