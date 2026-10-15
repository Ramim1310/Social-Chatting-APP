const prisma = require('../config/db');

const getMessages = async (req, res) => {
    const { room } = req.query;
    try {
        const messages = await prisma.message.findMany({
            where: room ? { room } : {},
            include: { sender: true },
            orderBy: { timestamp: 'asc' }
        });
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching messages' });
    }
};

const sendMessage = async (req, res) => {
    const { room, content, tempId } = req.body;
    if (typeof content !== 'string' || !content.trim() || typeof room !== 'string' || !room.trim()) {
        return res.status(400).json({ error: 'A room and message are required.' });
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

        if (!user) return res.status(404).json({ error: 'User not found' });

        const newMessage = await prisma.message.create({
            data: { content: content.trim(), senderId: user.id, room, status: 'sent' },
            include: { sender: true }
        });

        // Broadcast via Socket
        const io = req.app.get('io');
        const userSockets = req.app.get('userSockets');
        if (io && userSockets) {
            const senderSocketId = userSockets.get(user.id);
            if (senderSocketId) {
                io.to(room).except(senderSocketId).emit('receive_message', { ...newMessage, tempId });
                io.to(senderSocketId).emit('message_sent', {
                    tempId, id: newMessage.id, status: 'sent', timestamp: newMessage.timestamp
                });
            } else {
                io.to(room).emit('receive_message', { ...newMessage, tempId });
            }
        }

        res.json(newMessage);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to send message" });
    }
};

const searchMessages = async (req, res) => {
    const { q, room } = req.query;
    if (!q?.trim()) return res.json([]);

    try {
        const searchQuery = q.trim().split(/\s+/).filter(Boolean).map(w => w + ':*').join(' & ');
        const results = await prisma.$queryRaw`
            SELECT m.id, m.content, m.timestamp, m.room, u.id AS "senderId", u.name AS "senderName", u.image AS "senderImage",
            ts_rank(to_tsvector('english', m.content), to_tsquery('english', ${searchQuery})) AS rank,
            ts_headline('english', m.content, to_tsquery('english', ${searchQuery}), 'MaxWords=15, MinWords=5, ShortWord=3, HighlightAll=false, MaxFragments=1, FragmentDelimiter=" ... "') AS headline
            FROM "Message" m JOIN "User" u ON u.id = m."senderId"
            WHERE to_tsvector('english', m.content) @@ to_tsquery('english', ${searchQuery})
            ${room ? prisma.$queryRaw`AND m.room = ${room}` : prisma.$queryRaw``}
            ORDER BY rank DESC LIMIT 30
        `;
        res.json(results);
    } catch (err) {
        console.error(err);
        try {
            const fallback = await prisma.message.findMany({
                where: { content: { contains: q, mode: 'insensitive' }, ...(room ? { room } : {}) },
                include: { sender: { select: { id: true, name: true, image: true } } },
                orderBy: { timestamp: 'desc' },
                take: 30
            });
            res.json(fallback.map(m => ({ ...m, senderName: m.sender.name, senderImage: m.sender.image, headline: m.content })));
        } catch (fallbackErr) {
            res.status(500).json({ error: 'Search failed.' });
        }
    }
};

const createPoll = async (req, res) => {
    const { question, options, room, closesAt } = req.body;
    const userId = req.user.userId;

    if (!question?.trim() || !Array.isArray(options) || options.length < 2 || options.length > 6) {
        return res.status(400).json({ error: 'Provide a question and 2-6 options.' });
    }
    if (!room) return res.status(400).json({ error: 'room is required.' });

    try {
        const poll = await prisma.poll.create({
            data: {
                question: question.trim(), room, createdBy: userId, closesAt: closesAt ? new Date(closesAt) : null,
                options: { create: options.map(text => ({ text: String(text).trim() })) }
            },
            include: { options: { include: { votes: true } }, creator: { select: { id: true, name: true, image: true } } }
        });

        const io = req.app.get('io');
        if (io) io.to(room).emit('poll_created', poll);
        res.json(poll);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create poll.' });
    }
};

const votePoll = async (req, res) => {
    const { pollId } = req.params;
    const { optionId } = req.body;
    const userId = req.user.userId;

    try {
        const poll = await prisma.poll.findUnique({ where: { id: parseInt(pollId) }, include: { options: true } });
        if (!poll) return res.status(404).json({ error: 'Poll not found.' });
        if (poll.isClosed) return res.status(400).json({ error: 'Poll is closed.' });

        const validOption = poll.options.some(o => o.id === parseInt(optionId));
        if (!validOption) return res.status(400).json({ error: 'Invalid option.' });

        await prisma.pollVote.upsert({
            where: { pollId_userId: { pollId: parseInt(pollId), userId } },
            update: { optionId: parseInt(optionId) },
            create: { pollId: parseInt(pollId), optionId: parseInt(optionId), userId }
        });

        const updatedPoll = await prisma.poll.findUnique({
            where: { id: parseInt(pollId) },
            include: { options: { include: { votes: { select: { userId: true } } } }, creator: { select: { id: true, name: true } } }
        });

        const io = req.app.get('io');
        if (io) io.to(poll.room).emit('poll_updated', updatedPoll);
        res.json(updatedPoll);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to cast vote.' });
    }
};

const getPolls = async (req, res) => {
    try {
        const polls = await prisma.poll.findMany({
            where: { room: req.params.room },
            include: { options: { include: { votes: { select: { userId: true } } } }, creator: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(polls);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch polls.' });
    }
};

const getRoomAnalytics = async (req, res) => {
    const { room } = req.params;
    try {
        const heatmap = await prisma.$queryRaw`
            SELECT EXTRACT(DOW FROM "timestamp")::int AS day, EXTRACT(HOUR FROM "timestamp")::int AS hour, COUNT(*)::int AS count
            FROM "Message" WHERE room = ${room} AND "timestamp" > NOW() - INTERVAL '30 days' GROUP BY day, hour ORDER BY day, hour
        `;
        const topContributors = await prisma.$queryRaw`
            SELECT u.id, u.name, u.image, COUNT(m.id)::int AS message_count
            FROM "Message" m JOIN "User" u ON u.id = m."senderId"
            WHERE m.room = ${room} AND m."timestamp" > NOW() - INTERVAL '30 days' GROUP BY u.id, u.name, u.image ORDER BY message_count DESC LIMIT 5
        `;
        const summary = await prisma.$queryRaw`
            SELECT COUNT(*)::int AS total_messages, COUNT(DISTINCT "senderId")::int AS unique_senders, MIN("timestamp") AS first_message, MAX("timestamp") AS last_message
            FROM "Message" WHERE room = ${room}
        `;
        res.json({ heatmap, topContributors, summary: summary[0] || {} });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch analytics.' });
    }
};

const editMessage = async (req, res) => {
    const id = Number(req.params.messageId);
    const content = req.body.content;
    if (!Number.isSafeInteger(id) || id < 1 || typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: 'A valid message and content are required.' });
    }
    try {
        const existing = await prisma.message.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Message not found.' });
        if (existing.senderId !== req.user.userId) return res.status(403).json({ error: 'You can only edit your own messages.' });
        const message = await prisma.message.update({ where: { id }, data: { content: content.trim() }, include: { sender: true } });
        req.app.get('io')?.to(existing.room).emit('message_updated', message);
        res.json(message);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not update the message.' });
    }
};

const deleteMessage = async (req, res) => {
    const id = Number(req.params.messageId);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid message.' });
    try {
        const existing = await prisma.message.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Message not found.' });
        if (existing.senderId !== req.user.userId) return res.status(403).json({ error: 'You can only delete your own messages.' });
        await prisma.message.delete({ where: { id } });
        req.app.get('io')?.to(existing.room).emit('message_deleted', { id, room: existing.room });
        res.sendStatus(204);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Could not delete the message.' });
    }
};

module.exports = { getMessages, sendMessage, searchMessages, createPoll, votePoll, getPolls, getRoomAnalytics, editMessage, deleteMessage };
