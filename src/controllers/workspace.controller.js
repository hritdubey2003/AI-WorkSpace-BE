const workspaceService = require('../services/workspace.service');
const { ERROR_MESSAGES } = require('../constants/errorMessages');

const createWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'NAME_REQUIRED', message: ERROR_MESSAGES.WORKSPACE.NAME_REQUIRED },
      });
    }

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

const searchMembers = async (req, res, next) => {
  try {
    const users = await workspaceService.searchUsers(
      req.params.id,
      req.user.id,
      req.query.q
    );
    res.json(users);
  } catch (err) {
    next(err);
  }
};

const addMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { code: 'USER_ID_REQUIRED', message: ERROR_MESSAGES.WORKSPACE.USER_ID_REQUIRED },
      });
    }

    const member = await workspaceService.addMember(
      req.params.id,
      req.user.id,
      userId,
      role
    );
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
};

const removeMember = async (req, res, next) => {
  try {
    await workspaceService.removeMember(req.params.id, req.user.id, req.params.userId);
    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
};

const updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const member = await workspaceService.updateMemberRole(
      req.params.id,
      req.user.id,
      req.params.userId,
      role
    );
    res.json(member);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  deleteWorkspace,
  searchMembers,
  addMember,
  removeMember,
  updateMemberRole,
};
