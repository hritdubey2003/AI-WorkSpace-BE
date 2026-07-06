const prisma = require('../config/database');
const { ERROR_MESSAGES } = require('../constants/errorMessages');

const createWorkspace = async ({ name, description, userId }) => {
  const workspace = await prisma.workspace.create({
    data: {
      name,
      description,
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  return workspace;
};

const getUserWorkspaces = async (userId) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          _count: { select: { documents: true, members: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));
};

const getWorkspaceById = async (workspaceId, userId) => {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  if (!member) {
    const err = new Error(ERROR_MESSAGES.WORKSPACE.NOT_FOUND);
    err.status = 403;
    err.code = 'WORKSPACE_NOT_FOUND';
    throw err;
  }

  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { documents: true } },
    },
  });
};

const deleteWorkspace = async (workspaceId, userId) => {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  if (!member || member.role !== 'OWNER') {
    const err = new Error(ERROR_MESSAGES.WORKSPACE.OWNER_ONLY_DELETE);
    err.status = 403;
    err.code = 'OWNER_ONLY_DELETE';
    throw err;
  }

  await prisma.workspace.delete({ where: { id: workspaceId } });
};

const assertRequesterIsOwner = async (workspaceId, requesterId) => {
  const requesterMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: requesterId, workspaceId } },
  });
  if (!requesterMember || requesterMember.role !== 'OWNER') {
    const err = new Error(ERROR_MESSAGES.WORKSPACE.OWNER_ONLY_MANAGE_MEMBERS);
    err.status = 403;
    err.code = 'OWNER_ONLY_MANAGE_MEMBERS';
    throw err;
  }
};

const searchUsers = async (workspaceId, requesterId, query) => {
  await assertRequesterIsOwner(workspaceId, requesterId);

  if (!query || query.trim().length < 2) return [];

  return prisma.user.findMany({
    where: {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        { workspaces: { none: { workspaceId } } },
      ],
    },
    select: { id: true, name: true, email: true },
    take: 10,
  });
};

const addMember = async (workspaceId, requesterId, targetUserId, role = 'EDITOR') => {
  await assertRequesterIsOwner(workspaceId, requesterId);

  if (!['EDITOR', 'VIEWER'].includes(role)) {
    const err = new Error(ERROR_MESSAGES.WORKSPACE.INVALID_ROLE);
    err.status = 400;
    err.code = 'INVALID_ROLE';
    throw err;
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    const err = new Error(ERROR_MESSAGES.WORKSPACE.USER_NOT_FOUND);
    err.status = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
  });
  if (existing) {
    const err = new Error(ERROR_MESSAGES.WORKSPACE.ALREADY_MEMBER);
    err.status = 409;
    err.code = 'ALREADY_MEMBER';
    throw err;
  }

  return prisma.workspaceMember.create({
    data: { workspaceId, userId: targetUserId, role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

const removeMember = async (workspaceId, requesterId, targetUserId) => {
  await assertRequesterIsOwner(workspaceId, requesterId);

  const targetMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
  });
  if (!targetMember) {
    const err = new Error(ERROR_MESSAGES.WORKSPACE.MEMBER_NOT_FOUND);
    err.status = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  if (targetMember.role === 'OWNER') {
    const err = new Error(ERROR_MESSAGES.WORKSPACE.CANNOT_REMOVE_OWNER);
    err.status = 400;
    err.code = 'CANNOT_REMOVE_OWNER';
    throw err;
  }

  await prisma.workspaceMember.delete({
    where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
  });
};

const updateMemberRole = async (workspaceId, requesterId, targetUserId, role) => {
  await assertRequesterIsOwner(workspaceId, requesterId);

  if (!['EDITOR', 'VIEWER'].includes(role)) {
    const err = new Error(ERROR_MESSAGES.WORKSPACE.INVALID_ROLE);
    err.status = 400;
    err.code = 'INVALID_ROLE';
    throw err;
  }

  const targetMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
  });
  if (!targetMember) {
    const err = new Error(ERROR_MESSAGES.WORKSPACE.MEMBER_NOT_FOUND);
    err.status = 404;
    err.code = 'MEMBER_NOT_FOUND';
    throw err;
  }

  if (targetMember.role === 'OWNER') {
    const err = new Error(ERROR_MESSAGES.WORKSPACE.CANNOT_CHANGE_OWNER_ROLE);
    err.status = 400;
    err.code = 'CANNOT_CHANGE_OWNER_ROLE';
    throw err;
  }

  return prisma.workspaceMember.update({
    where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  deleteWorkspace,
  searchUsers,
  addMember,
  removeMember,
  updateMemberRole,
};
