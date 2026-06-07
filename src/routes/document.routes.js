const express = require('express');
const router = express.Router();
const {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  shareDocument,
  unshareDocument,
  getCollaborators,
} = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', createDocument);
router.get('/workspace/:workspaceId', getDocuments);
router.get('/:id', getDocument);
router.patch('/:id', updateDocument);
router.delete('/:id', deleteDocument);
router.post('/:id/share', shareDocument);
router.delete('/:id/share/:userId', unshareDocument);
router.get('/:id/collaborators', getCollaborators);

module.exports = router;
