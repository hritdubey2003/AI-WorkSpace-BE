const express = require('express');
const router = express.Router();
const {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  deleteWorkspace,
} = require('../controllers/workspace.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', createWorkspace);
router.get('/', getWorkspaces);
router.get('/:id', getWorkspace);
router.delete('/:id', deleteWorkspace);

module.exports = router;