const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('./auth');
const mediamtxRouter = require('./mediamtx');
const fs = require('node:fs/promises');
const path = require('node:path');
const { channelViewers } = require('../sockets/chat');

async function listVods(channel) {
  const dir = path.join(process.env.RECORDINGS_PATH || path.join(__dirname, '../../../recordings'), 'live', channel.username);
  try {
    const names = (await fs.readdir(dir)).filter(n => n.endsWith('.mp4')).sort().reverse();
    // The newest file is still being written while this channel is live.
    return Promise.all(names.slice(channel.isLive ? 1 : 0).map(async name => {
      const stat = await fs.stat(path.join(dir, name));
      return { name, size_mb: Number((stat.size / 1048576).toFixed(2)), url: `/vod/live/${channel.username}/${encodeURIComponent(name)}` };
    }));
  } catch (err) { if (err.code === 'ENOENT') return []; throw err; }
}

function getChannelStreamUrl(channel) {
  const activeStreams = mediamtxRouter.activeStreams;
  if (activeStreams && activeStreams.has(channel.username)) {
    const stream = activeStreams.get(channel.username);
    return `/hls/${stream.path}/index.m3u8`;
  }
  return `/hls/live/${channel.username}/index.m3u8`;
}

// GET /api/channels - List all channels
router.get('/', async (req, res) => {
  try {
    const channels = await db.listChannels();
    // Don't expose private streamKeys in public list
    const publicChannels = channels.map(c => ({
      id: c.id,
      username: c.username,
      title: c.title,
      category: c.category,
      isLive: c.isLive,
      viewerCount: channelViewers.get(c.username)?.size || 0,
      thumbnail: c.thumbnail,
      displayName: c.displayName,
      avatar: c.avatar,
      bio: c.bio,
      streamUrl: getChannelStreamUrl(c)
    }));

    res.json(publicChannels);
  } catch (err) {
    console.error('Error in GET /api/channels:', err);
    res.status(500).json({ error: 'Error al obtener la lista de canales' });
  }
});

// GET /api/channels/:username - Single channel details
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const channel = await db.findChannelByUsername(username);

    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }

    const user = await db.findUserByUsername(channel.username);

    res.json({
      id: channel.id,
      username: channel.username,
      title: channel.title,
      category: channel.category,
      isLive: channel.isLive,
      viewerCount: channelViewers.get(channel.username)?.size || 0,
      followers: await db.followers(channel.id),
      description: channel.description || '',
      vods: await listVods(channel),
      thumbnail: channel.thumbnail,
      displayName: user ? user.displayName : channel.username,
      avatar: user ? user.avatar : '',
      bio: user ? user.bio : '',
      streamUrl: getChannelStreamUrl(channel)
    });
  } catch (err) {
    console.error('Error in GET /api/channels/:username:', err);
    res.status(500).json({ error: 'Error al obtener información del canal' });
  }
});

// PUT /api/channels/:username - Update channel metadata (Auth required)
router.put('/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const { title, category, thumbnail, description } = req.body;
    if ((title !== undefined && (typeof title !== 'string' || !title.trim() || title.length > 120)) ||
        (category !== undefined && (typeof category !== 'string' || !category.trim() || category.length > 100)) ||
        (description !== undefined && (typeof description !== 'string' || description.length > 2000))) {
      return res.status(400).json({ error: 'Título, categoría o descripción inválidos' });
    }

    if (req.user.username.toLowerCase() !== username.toLowerCase()) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este canal' });
    }

    const channel = await db.findChannelByUsername(username);
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }

    const updateFields = {};
    if (title) updateFields.title = title;
    if (category) updateFields.category = category;
    if (thumbnail) updateFields.thumbnail = thumbnail;
    if (description !== undefined) updateFields.description = description;

    await db.updateChannel(channel.id, updateFields);
    const updatedChannel = await db.findChannelByUsername(username);

    res.json({
      message: 'Canal actualizado exitosamente',
      channel: updatedChannel
    });
  } catch (err) {
    console.error('Error in PUT /api/channels/:username:', err);
    res.status(500).json({ error: 'Error al actualizar el canal' });
  }
});

// POST /api/channels/:username/regenerate-key - Regenerate stream key (Auth required)
router.post('/:username/regenerate-key', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;

    if (req.user.username.toLowerCase() !== username.toLowerCase()) {
      return res.status(403).json({ error: 'No tienes permiso para regenerar esta clave' });
    }

    const channel = await db.findChannelByUsername(username);
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }

    const newKey = `live_${uuidv4().replace(/-/g, '')}`;
    await db.updateChannel(channel.id, { streamKey: newKey });

    res.json({
      message: 'Nueva clave de transmisión generada exitosamente',
      streamKey: newKey
    });
  } catch (err) {
    console.error('Error in POST /regenerate-key:', err);
    res.status(500).json({ error: 'Error al generar nueva clave de transmisión' });
  }
});

// GET /api/channels/:username/messages - Fetch chat history
router.get('/:username/messages', async (req, res) => {
  try {
    const { username } = req.params;
    const channel = await db.findChannelByUsername(username);
    if (!channel) {
      return res.status(404).json({ error: 'Canal no encontrado' });
    }

    const messages = await db.getMessagesByChannelId(channel.id, 50);
    res.json(messages);
  } catch (err) {
    console.error('Error in GET /api/channels/:username/messages:', err);
    res.status(500).json({ error: 'Error al obtener mensajes del chat' });
  }
});

module.exports = router;
router.post('/:username/follow', authenticateToken, async (req, res, next) => {
  try {
    const channel = await db.findChannelByUsername(req.params.username);
    if (!channel) return res.status(404).json({ error: 'Canal no encontrado' });
    if (channel.userId === req.user.id) return res.status(400).json({ error: 'No puedes seguir tu propio canal' });
    const following = await db.toggleFollow(req.user.id, channel.id);
    res.json({ following, followers: await db.followers(channel.id) });
  } catch (err) { next(err); }
});
