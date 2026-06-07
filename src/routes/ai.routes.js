const express = require('express');
const router = express.Router();
const { summarize, improve, generateTasks } = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/summarize/:docId', summarize);
router.post('/improve/:docId', improve);
router.post('/tasks/:docId', generateTasks);

module.exports = router;