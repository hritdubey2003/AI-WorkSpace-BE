const express = require('express');
const router = express.Router();
const {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  deleteWorkspace,
  searchMembers,
  addMember,
  removeMember,
  updateMemberRole,
} = require('../controllers/workspace.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', createWorkspace);
router.get('/', getWorkspaces);
router.get('/:id', getWorkspace);
router.delete('/:id', deleteWorkspace);
router.get('/:id/members/search', searchMembers);
router.post('/:id/members', addMember);
router.patch('/:id/members/:userId', updateMemberRole);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;