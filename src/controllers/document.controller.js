const documentService = require('../services/document.service');

const createDocument = async (req, res, next) => {
  try {
    const { title, workspaceId } = req.body;
    if (!workspaceId)
      return res.status(400).json({ message: 'workspaceId is required' });

    const doc = await documentService.createDocument({
      title: title || 'Untitled',
      workspaceId,
      authorId: req.user.id,
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

const getDocuments = async (req, res, next) => {
  try {
    const docs = await documentService.getDocuments(
      req.params.workspaceId,
      req.user.id
    );
    res.json(docs);
  } catch (err) {
    next(err);
  }
};

const getDocument = async (req, res, next) => {
  try {
    const doc = await documentService.getDocumentById(
      req.params.id,
      req.user.id
    );
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

const updateDocument = async (req, res, next) => {
  try {
    const doc = await documentService.updateDocument(
      req.params.id,
      req.user.id,
      req.body
    );
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    await documentService.deleteDocument(req.params.id, req.user.id);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
};

const shareDocument = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const collaborator = await documentService.shareDocument(
      req.params.id,
      req.user.id,
      email
    );
    res.status(201).json(collaborator);
  } catch (err) {
    next(err);
  }
};

const unshareDocument = async (req, res, next) => {
  try {
    await documentService.unshareDocument(
      req.params.id,
      req.user.id,
      req.params.userId
    );
    res.json({ message: 'Access removed' });
  } catch (err) {
    next(err);
  }
};

const getCollaborators = async (req, res, next) => {
  try {
    const collaborators = await documentService.getCollaborators(
      req.params.id,
      req.user.id
    );
    res.json(collaborators);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  shareDocument,
  unshareDocument,
  getCollaborators,
};
