const prisma = require('../config/db');

module.exports = function(io, userSockets, onlineUsers) {
    io.on('connection', (socket) => {
        console.log(`User Connected: ${socket.id}`);

        socket.on('user_connected', (userData) => {
            onlineUsers.set(socket.id, userData);
            userSockets.set(userData.id, socket.id);
            io.emit('active_users', Array.from(onlineUsers.values()));
        });

        socket.on('join_chat', (roomID) => {
            socket.join(roomID);
        });

        socket.on('join_room', (data) => {
            socket.join(data);
        });

        socket.on('send_message', async (data) => {
            const { room, author, content, email, senderId, tempId } = data;
            try {
                let user;
                if (senderId) user = await prisma.user.findUnique({ where: { id: senderId } });
                else user = await prisma.user.findUnique({ where: { email } });

                if (!user) return;

                const newMessage = await prisma.message.create({
                    data: { content, senderId: user.id, room, status: 'sent' },
                    include: { sender: true }
                });

                socket.to(room).emit('receive_message', newMessage);
                socket.emit('message_sent', { tempId, id: newMessage.id, status: 'sent', timestamp: newMessage.timestamp });
            } catch (err) {
                console.error(err);
            }
        });

        socket.on('mark_messages_read', async ({ room, userId }) => {
            try {
                await prisma.message.updateMany({
                    where: { room, senderId: { not: userId }, status: { not: 'seen' } },
                    data: { status: 'seen', seenAt: new Date() }
                });
                socket.to(room).emit('messages_seen', { room });
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('typing', (room) => {
            socket.to(room).emit('display_typing', socket.id);
        });

        socket.on('stop_typing', (room) => {
            socket.to(room).emit('hide_typing', socket.id);
        });

        socket.on('sendFriendRequest', async ({ senderId, receiverId }, callback) => {
            if (senderId === receiverId) return callback({ error: "Cannot send request to yourself" });
            try {
                const existing = await prisma.friendRequest.findFirst({
                    where: { OR: [{ senderId, receiverId }, { senderId: receiverId, receiverId: senderId }] }
                });
                if (existing) return callback({ error: "Request exists" });

                const request = await prisma.friendRequest.create({ data: { senderId, receiverId, status: 'pending' } });
                const receiverSocketId = userSockets.get(receiverId);
                if (receiverSocketId) {
                    const sender = await prisma.user.findUnique({ where: { id: senderId } });
                    io.to(receiverSocketId).emit('friend_request_received', { requestId: request.id, senderName: sender.name, senderId: sender.id });
                }
                callback({ success: true, request });
            } catch (err) {
                console.error(err);
                callback({ error: "Internal Server Error" });
            }
        });

        socket.on('disconnect', async () => {
            console.log('User Disconnected', socket.id);
            if (onlineUsers.has(socket.id)) {
                const user = onlineUsers.get(socket.id);
                if (user && user.id) {
                    userSockets.delete(user.id);
                    try {
                        await prisma.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } });
                    } catch (e) {
                        console.error(e);
                    }
                }
                onlineUsers.delete(socket.id);
                io.emit('active_users', Array.from(onlineUsers.values()));
            }
        });
    });
};
