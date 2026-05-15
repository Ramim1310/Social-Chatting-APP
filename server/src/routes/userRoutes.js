const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
    searchUsers, getCurrentUser, updateCurrentUser,
    sendFriendRequest, getPendingRequests, acceptFriendRequest, rejectFriendRequest
} = require('../controllers/userController');

router.post('/search', authenticateToken, searchUsers);
router.get('/me', authenticateToken, getCurrentUser);
router.patch('/me', authenticateToken, updateCurrentUser);

// Friend Requests
router.post('/friend-request/send', authenticateToken, sendFriendRequest);
router.get('/friend-request/pending/:userId', authenticateToken, getPendingRequests);
router.post('/friend-request/accept', authenticateToken, acceptFriendRequest);
router.post('/friend-request/reject', authenticateToken, rejectFriendRequest);

module.exports = router;
