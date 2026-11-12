const db = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../routes/auth');

// Map to track viewers per channel: channelUsername -> Set of socket.id
const channelViewers = new Map();

function setupChatSockets(io) {
  io.on('connection', (socket) => {
    let currentChannel = null;
    let currentUser = null;
    let lastMessage = 0;
    try {
      const claims = jwt.verify(socket.handshake.auth?.token, JWT_SECRET);
      currentUser = claims;
    } catch { /* Anonymous viewers can join, but cannot send messages. */ }

    console.log(`🔌 Cliente conectado al socket: ${socket.id}`);

    // Join channel chat room
    socket.on('join_channel', async ({ channelUsername } = {}) => {
      if (typeof channelUsername !== 'string') return;
      if (!await db.findChannelByUsername(channelUsername)) return;

      const normChannel = channelUsername.toLowerCase();

      // If switching channels, leave previous
      if (currentChannel && currentChannel !== normChannel) {
        socket.leave(`channel:${currentChannel}`);
        const prevSet = channelViewers.get(currentChannel);
        if (prevSet) {
          prevSet.delete(socket.id);
          io.to(`channel:${currentChannel}`).emit('viewer_count_update', {
            channel: currentChannel,
            count: prevSet.size
          });
        }
      }

      currentChannel = normChannel;

      socket.join(`channel:${normChannel}`);

      // Update viewer count
      if (!channelViewers.has(normChannel)) {
        channelViewers.set(normChannel, new Set());
      }
      const viewers = channelViewers.get(normChannel);
      viewers.add(socket.id);

      // Emit viewer count to everyone in channel
      io.to(`channel:${normChannel}`).emit('viewer_count_update', {
        channel: normChannel,
        count: viewers.size
      });

      console.log(`👤 Espectador se unió a #${normChannel} (Total: ${viewers.size})`);
    });

    // Leave channel chat room
    socket.on('leave_channel', () => {
      const normChannel = currentChannel;
      if (!normChannel) return;

      socket.leave(`channel:${normChannel}`);
      const viewers = channelViewers.get(normChannel);
      if (viewers) {
        viewers.delete(socket.id);
        io.to(`channel:${normChannel}`).emit('viewer_count_update', {
          channel: normChannel,
          count: viewers.size
        });
      }
      currentChannel = null;
    });

    // Send chat message
    socket.on('send_message', async ({ content } = {}) => {
      if (!currentUser) return socket.emit('chat:error', 'Inicia sesión para chatear');
      const normChannel = currentChannel;
      if (!normChannel || typeof content !== 'string' || !content.trim()) return;
      if (content.length > 300) return socket.emit('chat:error', 'Máximo 300 caracteres');
      if (Date.now() - lastMessage < 700) return socket.emit('chat:error', 'Espera 700 ms entre mensajes');
      lastMessage = Date.now();

      const channel = await db.findChannelByUsername(normChannel);
      if (!channel) return;

      const sender = await db.findUserById(currentUser.id);
      if (!sender) return socket.emit('chat:error', 'Sesión inválida');

      // Determine badge & color
      let badge = null;
      if (sender.username.toLowerCase() === channel.username.toLowerCase()) {
        badge = 'BROADCASTER';
      } else if (sender.role === 'admin') {
        badge = 'ADMIN';
      }

      // Generate consistent color based on username
      const colors = ['#FF4500', '#2E8B57', '#00CED1', '#FF69B4', '#9370DB', '#FFD700', '#1E90FF', '#FF6347'];
      let hash = 0;
      for (let i = 0; i < sender.username.length; i++) {
        hash = sender.username.charCodeAt(i) + ((hash << 5) - hash);
      }
      const color = colors[Math.abs(hash) % colors.length];

      try {
        const savedMessage = await db.addMessage({
          channelId: channel.id,
          username: sender.username,
          displayName: sender.displayName || sender.username,
          content: content.trim(),
          color,
          badge
        });

        // Broadcast to everyone in channel room
        io.to(`channel:${normChannel}`).emit('receive_message', {
          ...savedMessage,
          channel: normChannel
        });
      } catch (err) {
        console.error('Error saving message:', err);
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      if (currentChannel) {
        const viewers = channelViewers.get(currentChannel);
        if (viewers) {
          viewers.delete(socket.id);
          io.to(`channel:${currentChannel}`).emit('viewer_count_update', {
            channel: currentChannel,
            count: viewers.size
          });
        }
      }
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
  });
}

module.exports = { setupChatSockets, channelViewers };
