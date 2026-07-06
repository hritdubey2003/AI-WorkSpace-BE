const express = require('express');
const router = express.Router();
const {
  createDocument,
  getDocuments,
  getSharedDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  shareDocument,
  unshareDocument,
  leaveSharedDocument,
  getCollaborators,
} = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', createDocument);
router.get('/workspace/:workspaceId', getDocuments);
router.get('/shared-with-me', getSharedDocuments);
router.get('/:id', getDocument);
router.patch('/:id', updateDocument);
router.delete('/:id', deleteDocument);
router.post('/:id/share', shareDocument);
router.delete('/:id/share/:userId', unshareDocument);
router.delete('/:id/share', leaveSharedDocument);
router.get('/:id/collaborators', getCollaborators);

module.exports = router;
