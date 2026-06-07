const workspaceService = require('../services/workspace.service');


const createWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const workspace = await workspaceService.createWorkspace({
      name,
      description,
      userId: req.user.id,
    });
    res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
};

const getWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await workspaceService.getUserWorkspaces(req.user.id);
    res.json(workspaces);
  } catch (err) {
    next(err);
  }
};

const getWorkspace = async (req, res, next) => {
  try {
    const workspace = await workspaceService.getWorkspaceById(
      req.params.id,
      req.user.id
    );
    res.json(workspace);
  } catch (err) {
    next(err);
  }
};

const deleteWorkspace = async (req, res, next) => {
  try {
    await workspaceService.deleteWorkspace(req.params.id, req.user.id);
    res.json({ message: 'Workspace deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  deleteWorkspace,
};