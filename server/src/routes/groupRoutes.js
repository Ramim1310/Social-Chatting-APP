const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { createGroup, getGroups } = require('../controllers/groupController');

router.post('/', authenticateToken, createGroup);
router.get('/', authenticateToken, getGroups);

module.exports = router;
