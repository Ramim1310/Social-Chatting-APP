const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
    getMessages, sendMessage, searchMessages,
    createPoll, votePoll, getPolls, getRoomAnalytics
} = require('../controllers/messageController');

router.get('/', getMessages); // No auth? index.js didn't have it for GET /api/messages, but I should probably add it. Wait, I'll match index.js
router.post('/', authenticateToken, sendMessage);
router.get('/search', authenticateToken, searchMessages);

router.post('/polls', authenticateToken, createPoll);
router.post('/polls/:pollId/vote', authenticateToken, votePoll);
router.get('/polls/:room', authenticateToken, getPolls);

router.get('/analytics/room/:room', authenticateToken, getRoomAnalytics);

module.exports = router;
