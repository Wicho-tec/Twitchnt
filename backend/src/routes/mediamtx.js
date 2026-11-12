const express = require('express');
const db = require('../db');
const router = express.Router();
const activeStreams = new Map();
const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const nodePath = require('node:path');
const thumbnails = new Map();
const apiUrl = process.env.MEDIAMTX_API_URL || 'http://127.0.0.1:9997';

// Only the private key authorizes publishing; the public path never contains it.
router.post('/auth', async (req, res, next) => {
  try {
    const { action, path, query, password } = req.body;
    if (action === 'read' || action === 'playback') return res.sendStatus(200);
    if (action !== 'publish' || typeof path !== 'string') return res.sendStatus(401);
    const match = /^live\/([a-z0-9_]{3,20})$/.exec(path);
    const key = password || new URLSearchParams(query || '').get('key');
    const channel = match && await db.findChannelByUsername(match[1]);
    if (!key || !channel || channel.streamKey !== key) return res.sendStatus(401);
    res.sendStatus(200);
  } catch (err) { next(err); }
});

async function pollStreams(io) {
  try {
    const res = await fetch(`${apiUrl}/v3/paths/list`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return;
    const { items = [] } = await res.json();
    const paths = new Set(items.filter(p => p.ready).map(p => p.name));
    for (const channel of await db.listChannels()) {
      const path = `live/${channel.username}`;
      const isLive = paths.has(path);
      if (isLive) activeStreams.set(channel.username, { path });
      else activeStreams.delete(channel.username);
      if (isLive && Date.now() - (thumbnails.get(channel.username) || 0) > 30000) {
        thumbnails.set(channel.username, Date.now());
        const dir = nodePath.join(process.env.RECORDINGS_PATH || nodePath.join(__dirname, '../../../recordings'), 'thumbnails');
        await fs.mkdir(dir, { recursive: true });
        const source = `${process.env.MEDIAMTX_HLS_URL || 'http://127.0.0.1:8888'}/${path}/index.m3u8`;
        execFile(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-i', source, '-frames:v', '1', '-vf', 'scale=640:-2', nodePath.join(dir, `${channel.username}.jpg`)], { timeout: 15000, windowsHide: true }, async err => {
          if (!err) {
            try { await db.updateChannel(channel.id, { thumbnail: `/thumbnails/${channel.username}.jpg` }); }
            catch (error) { console.error('No se pudo guardar la miniatura:', error.message); }
          }
        });
      }
      if (channel.isLive !== isLive) {
        await db.updateChannel(channel.id, { isLive });
        io.emit('live', { username: channel.username, isLive });
      }
    }
  } catch (err) {
    // A failed poll cannot prove that a publisher disconnected.
  }
}

router.startPolling = io => {
  pollStreams(io);
  setInterval(() => pollStreams(io), 2000).unref();
};
router.activeStreams = activeStreams;
module.exports = router;
