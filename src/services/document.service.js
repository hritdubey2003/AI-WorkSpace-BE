const prisma = require('../config/database');

const assertDocumentAccess = async (docId, userId) => {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) {
    const err = new Error('Document not found');
    err.status = 404;
    throw err;
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: doc.workspaceId } },
  });
  if (member?.role === 'owner') return { doc, isOwner: true };

  const collaborator = await prisma.documentCollaborator.findUnique({
    where: { documentId_userId: { documentId: docId, userId } },
  });
  if (collaborator) return { doc, isOwner: false };

  const err = new Error('Access denied');
  err.status = 403;
  throw err;
};

const createDocument = async ({ title, workspaceId, authorId }) => {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: authorId, workspaceId } },
  });
  if (!member || member.role !== 'owner') {
    const err = new Error('Only the workspace owner can create documents');
    err.status = 403;
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

  if (member?.role === 'owner') {
    return prisma.document.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Non-owners only see documents explicitly shared with them in this workspace
  const collaborations = await prisma.documentCollaborator.findMany({
    where: { userId, document: { workspaceId } },
    include: { document: true },
    orderBy: { createdAt: 'desc' },
  });

  return collaborations.map((c) => c.document);
};

const getDocumentById = async (id, userId) => {
  const { doc } = await assertDocumentAccess(id, userId);
  return doc;
};

const updateDocument = async (id, userId, data) => {
  await assertDocumentAccess(id, userId);

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
    const err = new Error('Only the workspace owner can delete documents');
    err.status = 403;
    throw err;
  }

  await prisma.document.delete({ where: { id } });
};

const shareDocument = async (docId, requesterId, email) => {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) {
    const err = new Error('Document not found');
    err.status = 404;
    throw err;
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: requesterId, workspaceId: doc.workspaceId } },
  });
  if (!member || member.role !== 'owner') {
    const err = new Error('Only the workspace owner can share documents');
    err.status = 403;
    throw err;
  }

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) {
    const err = new Error('No user found with that email');
    err.status = 404;
    throw err;
  }

  if (target.id === requesterId) {
    const err = new Error('Cannot share document with yourself');
    err.status = 400;
    throw err;
  }

  const existing = await prisma.documentCollaborator.findUnique({
    where: { documentId_userId: { documentId: docId, userId: target.id } },
  });
  if (existing) {
    const err = new Error('Document already shared with this user');
    err.status = 409;
    throw err;
  }

  return prisma.documentCollaborator.create({
    data: { documentId: docId, userId: target.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

const unshareDocument = async (docId, requesterId, targetUserId) => {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) {
    const err = new Error('Document not found');
    err.status = 404;
    throw err;
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: requesterId, workspaceId: doc.workspaceId } },
  });
  if (!member || member.role !== 'owner') {
    const err = new Error('Only the workspace owner can remove access');
    err.status = 403;
    throw err;
  }

  const collaborator = await prisma.documentCollaborator.findUnique({
    where: { documentId_userId: { documentId: docId, userId: targetUserId } },
  });
  if (!collaborator) {
    const err = new Error('User does not have access to this document');
    err.status = 404;
    throw err;
  }

  await prisma.documentCollaborator.delete({
    where: { documentId_userId: { documentId: docId, userId: targetUserId } },
  });
};

const getCollaborators = async (docId, requesterId) => {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) {
    const err = new Error('Document not found');
    err.status = 404;
    throw err;
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: requesterId, workspaceId: doc.workspaceId } },
  });
  if (!member || member.role !== 'owner') {
    const err = new Error('Only the workspace owner can view collaborators');
    err.status = 403;
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
  getDocumentById,
  updateDocument,
  deleteDocument,
  shareDocument,
  unshareDocument,
  getCollaborators,
};
