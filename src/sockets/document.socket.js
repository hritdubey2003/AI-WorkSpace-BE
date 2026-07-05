const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/database');
const { assertDocumentAccess } = require('../services/document.service');

const documentRooms = new Map(); // docId -> Set of userIds
const saveTimers = new Map();   // docId -> timeout handle

const scheduleSave = (docId, data) => {
  if (saveTimers.has(docId)) clearTimeout(saveTimers.get(docId));
  saveTimers.set(
    docId,
    setTimeout(async () => {
      saveTimers.delete(docId);
      await prisma.document.update({ where: { id: docId }, data });
    }, 2000)
  );
};

const setupDocumentSockets = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));

    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.userId})`);
    socket.docPermissions = {};

    // Join document room
    socket.on('join-document', async ({ docId }) => {
      try {
        const { doc, canEdit } = await assertDocumentAccess(docId, socket.userId);
        socket.docPermissions[docId] = canEdit;

        socket.join(docId);

        if (!documentRooms.has(docId)) {
          documentRooms.set(docId, new Set());
        }
        documentRooms.get(docId).add(socket.userId);

        // Send current collaborators count
        io.to(docId).emit('collaborators-update', {
          count: documentRooms.get(docId).size,
          userIds: [...documentRooms.get(docId)],
        });

        // Send document content to the joining user
        socket.emit('document-loaded', {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          emoji: doc.emoji,
        });

        console.log(`User ${socket.userId} joined document ${docId}`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    // Broadcast document changes to other users in the room and debounce-save to DB
    socket.on('document-change', ({ docId, content, title }) => {
      if (!socket.docPermissions[docId]) {
        return socket.emit('error', { message: 'You have view-only access to this document.' });
      }

      socket.to(docId).emit('document-updated', {
        content,
        title,
        updatedBy: socket.userId,
      });

      const update = {};
      if (content !== undefined) update.content = content;
      if (title !== undefined) update.title = title;
      if (Object.keys(update).length) scheduleSave(docId, update);
    });

    // User is typing
    socket.on('user-typing', ({ docId }) => {
      socket.to(docId).emit('collaborator-typing', {
        userId: socket.userId,
      });
    });

    // Leave document room
    socket.on('leave-document', ({ docId }) => {
      socket.leave(docId);
      if (documentRooms.has(docId)) {
        documentRooms.get(docId).delete(socket.userId);
        if (documentRooms.get(docId).size === 0) {
          documentRooms.delete(docId);
        } else {
          io.to(docId).emit('collaborators-update', {
            count: documentRooms.get(docId).size,
            userIds: [...documentRooms.get(docId)],
          });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      // Remove from all rooms
      documentRooms.forEach((users, docId) => {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          if (users.size === 0) {
            documentRooms.delete(docId);
          } else {
            io.to(docId).emit('collaborators-update', {
              count: users.size,
              userIds: [...users],
            });
          }
        }
      });
    });
  });
};

module.exports = { setupDocumentSockets };