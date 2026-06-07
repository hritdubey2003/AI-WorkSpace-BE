const prisma = require('../config/database');

const createWorkspace = async ({ name, description, userId }) => {
  const workspace = await prisma.workspace.create({
    data: {
      name,
      description,
      members: {
        create: {
          userId,
          role: 'owner',
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
    const err = new Error('Access denied or workspace not found');
    err.status = 403;
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

  if (!member || member.role !== 'owner') {
    const err = new Error('Only the owner can delete this workspace');
    err.status = 403;
    throw err;
  }

  await prisma.workspace.delete({ where: { id: workspaceId } });
};

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  deleteWorkspace,
};