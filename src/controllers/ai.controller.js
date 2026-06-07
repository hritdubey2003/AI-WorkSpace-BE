const aiService = require('../services/ai.service');
const documentService = require('../services/document.service');

const summarize = async (req, res, next) => {
  try {
    const doc = await documentService.getDocumentById(
      req.params.docId,
      req.user.id
    );
    const result = await aiService.summarizeDocument(doc.content);
    res.json({ result });
  } catch (err) {
    next(err);
  }
};

const improve = async (req, res, next) => {
  try {
    const doc = await documentService.getDocumentById(
      req.params.docId,
      req.user.id
    );
    const result = await aiService.improveWriting(doc.content);
    res.json({ result });
  } catch (err) {
    next(err);
  }
};

const generateTasks = async (req, res, next) => {
  try {
    const doc = await documentService.getDocumentById(
      req.params.docId,
      req.user.id
    );
    const result = await aiService.generateTasks(doc.content);
    res.json({ result });
  } catch (err) {
    next(err);
  }
};

module.exports = { summarize, improve, generateTasks };