const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
    getPosts, createPost, createComment, togglePostLike, getPostLikes,
    getLiveNews, getCategoryNews
} = require('../controllers/communityController');

// Posts & Comments
router.get('/posts', authenticateToken, getPosts);
router.post('/posts', authenticateToken, createPost);
router.post('/posts/:postId/comments', authenticateToken, createComment);
router.post('/posts/:postId/like', authenticateToken, togglePostLike);
router.get('/posts/:postId/likes', authenticateToken, getPostLikes);

// News
router.get('/news/live', getLiveNews);
router.get('/news/:category', getCategoryNews);

module.exports = router;
