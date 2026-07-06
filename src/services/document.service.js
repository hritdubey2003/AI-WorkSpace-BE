const prisma = require('../config/database');
const { ERROR_MESSAGES } = require('../constants/errorMessages');

const assertDocumentAccess = async (docId, userId) => {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.NOT_FOUND);
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: doc.workspaceId } },
  });
  if (member?.role === 'OWNER') {
    return { doc, isOwner: true, isWorkspaceOwner: true, isWorkspaceMember: true, canEdit: true };
  }
  if (member) {
    return {
      doc,
      isOwner: false,
      isWorkspaceOwner: false,
      isWorkspaceMember: true,
      canEdit: member.role === 'EDITOR',
    };
  }

  const collaborator = await prisma.documentCollaborator.findUnique({
    where: { documentId_userId: { documentId: docId, userId } },
  });
  if (collaborator) {
    return {
      doc,
      isOwner: false,
      isWorkspaceOwner: false,
      isWorkspaceMember: false,
      canEdit: collaborator.role === 'EDITOR',
    };
  }

  const err = new Error(ERROR_MESSAGES.DOCUMENT.ACCESS_DENIED);
  err.status = 403;
  err.code = 'ACCESS_DENIED';
  throw err;
};

const createDocument = async ({ title, workspaceId, authorId }) => {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: authorId, workspaceId } },
  });
  if (!member || member.role === 'VIEWER') {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.VIEWER_CANNOT_CREATE);
    err.status = 403;
    err.code = 'VIEWER_CANNOT_CREATE';
    throw err;
  }

  return prisma.document.create({
    data: { title, workspaceId, authorId },
  });
};

const getDocuments = async (workspaceId, userId) => {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  // Any workspace member (owner or plain member) sees every document in the workspace
  if (member) {
    return prisma.document.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Non-members have no workspace-wide doc list; they only access docs shared with them directly
  return [];
};

const getSharedDocuments = async (userId) => {
  const collaborations = await prisma.documentCollaborator.findMany({
    where: { userId },
    include: {
      document: {
        include: { workspace: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return collaborations.map((c) => ({
    ...c.document,
    role: c.role,
    canEdit: c.role === 'EDITOR',
  }));
};

const leaveSharedDocument = async (docId, userId) => {
  const collaborator = await prisma.documentCollaborator.findUnique({
    where: { documentId_userId: { documentId: docId, userId } },
  });
  if (!collaborator) {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.COLLABORATOR_NOT_FOUND);
    err.status = 404;
    err.code = 'COLLABORATOR_NOT_FOUND';
    throw err;
  }

  await prisma.documentCollaborator.delete({
    where: { documentId_userId: { documentId: docId, userId } },
  });
};

const getDocumentById = async (id, userId) => {
  const { doc, isWorkspaceOwner, canEdit } = await assertDocumentAccess(id, userId);
  return { ...doc, isWorkspaceOwner, canEdit };
};

const updateDocument = async (id, userId, data) => {
  const { canEdit } = await assertDocumentAccess(id, userId);
  if (!canEdit) {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.VIEWER_READ_ONLY);
    err.status = 403;
    err.code = 'VIEWER_READ_ONLY';
    throw err;
  }

  const { title, content, emoji } = data;
  return prisma.document.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(emoji !== undefined && { emoji }),
    },
  });
};

const deleteDocument = async (id, userId) => {
  const { isOwner } = await assertDocumentAccess(id, userId);

  if (!isOwner) {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.OWNER_ONLY_DELETE);
    err.status = 403;
    err.code = 'OWNER_ONLY_DELETE';
    throw err;
  }

  await prisma.document.delete({ where: { id } });
};

const shareDocument = async (docId, requesterId, email, role = 'EDITOR') => {
  if (!['EDITOR', 'VIEWER'].includes(role)) {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.INVALID_ROLE);
    err.status = 400;
    err.code = 'INVALID_ROLE';
    throw err;
  }

  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.NOT_FOUND);
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const requesterMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: requesterId, workspaceId: doc.workspaceId } },
  });
  if (!requesterMember || requesterMember.role !== 'OWNER') {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.OWNER_ONLY_SHARE);
    err.status = 403;
    err.code = 'OWNER_ONLY_SHARE';
    throw err;
  }

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.USER_EMAIL_NOT_FOUND);
    err.status = 404;
    err.code = 'USER_EMAIL_NOT_FOUND';
    throw err;
  }

  if (target.id === requesterId) {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.SHARE_SELF);
    err.status = 400;
    err.code = 'SHARE_SELF';
    throw err;
  }

  // Document sharing is for guests outside the workspace; members already have full access
  const targetMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: target.id, workspaceId: doc.workspaceId } },
  });
  if (targetMember) {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.ALREADY_WORKSPACE_MEMBER);
    err.status = 400;
    err.code = 'ALREADY_WORKSPACE_MEMBER';
    throw err;
  }

  return prisma.documentCollaborator.upsert({
    where: { documentId_userId: { documentId: docId, userId: target.id } },
    create: { documentId: docId, userId: target.id, role },
    update: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

const unshareDocument = async (docId, requesterId, targetUserId) => {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.NOT_FOUND);
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: requesterId, workspaceId: doc.workspaceId } },
  });
  if (!member || member.role !== 'OWNER') {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.OWNER_ONLY_REMOVE_ACCESS);
    err.status = 403;
    err.code = 'OWNER_ONLY_REMOVE_ACCESS';
    throw err;
  }

  const collaborator = await prisma.documentCollaborator.findUnique({
    where: { documentId_userId: { documentId: docId, userId: targetUserId } },
  });
  if (!collaborator) {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.COLLABORATOR_NOT_FOUND);
    err.status = 404;
    err.code = 'COLLABORATOR_NOT_FOUND';
    throw err;
  }

  await prisma.documentCollaborator.delete({
    where: { documentId_userId: { documentId: docId, userId: targetUserId } },
  });
};

const getCollaborators = async (docId, requesterId) => {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.NOT_FOUND);
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: requesterId, workspaceId: doc.workspaceId } },
  });
  if (!member || member.role !== 'OWNER') {
    const err = new Error(ERROR_MESSAGES.DOCUMENT.OWNER_ONLY_COLLABORATORS);
    err.status = 403;
    err.code = 'OWNER_ONLY_COLLABORATORS';
    throw err;
  }

  return prisma.documentCollaborator.findMany({
    where: { documentId: docId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
};

module.exports = {
  createDocument,
  getDocuments,
  getSharedDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  shareDocument,
  unshareDocument,
  leaveSharedDocument,
  getCollaborators,
  assertDocumentAccess,
};
