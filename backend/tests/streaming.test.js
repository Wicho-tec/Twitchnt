// Run against the Compose stack: node backend/tests/streaming.test.js
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { io } = require('../../frontend/node_modules/socket.io-client');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const host = new URL(base).hostname;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function api(url, body, token) {
  const response = await fetch(`${base}/api${url}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  assert(response.ok, `${url}: ${response.status}`);
  return response.json();
}
function publish(username, key, seconds) {
  const startedAt = Date.now();
  const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-re', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=15', '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-t', String(seconds), '-vf', "drawtext=text='%{pts\\:hms}':fontcolor=white:fontsize=32:box=1:boxcolor=black:x=10:y=10", '-c:v', 'libx264', '-preset', 'ultrafast', '-b:v', '500k', '-g', '30', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-f', 'flv', `rtmp://${host}:1935/live/${username}?key=${key}`], { windowsHide: true, stdio: 'ignore' });
  const done = once(child, 'exit');
  return { child, done, startedAt };
}
async function main() {
  const users = [];
  const streams = [];
  const sockets = [];
  try {
    for (let i = 0; i < 3; i++) {
      const username = `prueba_${Date.now().toString(36)}_${i}`;
      users.push(await api('/auth/register', { username, password: 'StreamTest42!', email: `${username}@example.com` }));
    }
    const bad = publish(users[0].user.username, 'INVALID', 8);
    assert.notEqual((await bad.done)[0], 0, 'invalid RTMP key must fail');
    for (const user of users) streams.push(publish(user.user.username, user.channel.streamKey, Number(process.env.TEST_SECONDS || 45)));
    const stateDir = path.join(__dirname, '../../tmp');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(path.join(stateDir, 'streaming-state.json'), JSON.stringify(users.map((u, i) => ({ username: u.user.username, url: `${base}/${u.user.username}`, startedAt: streams[i].startedAt })), null, 2));
    await delay(12000);
    for (const user of users) {
      const channel = await api(`/channels/${user.user.username}`);
      assert.equal(channel.isLive, true);
      assert(!JSON.stringify(channel).includes(user.channel.streamKey));
      const playlist = await fetch(`${base}${channel.streamUrl}`);
      assert(playlist.ok);
      assert.match(await playlist.text(), /#EXTM3U/);
    }
    console.log(`LIVE: ${users.map(u => `${base}/${u.user.username}`).join(' ')}`);
    for (let i = 0; i < 2; i++) {
      const socket = io(base, { auth: { token: users[i].token }, forceNew: true });
      sockets.push(socket);
      await once(socket, 'connect');
      const count = once(socket, 'viewer_count_update');
      socket.emit('join_channel', { channelUsername: users[0].user.username });
      assert.equal((await count)[0].count, i + 1);
    }
    const received = once(sockets[1], 'receive_message');
    sockets[0].emit('send_message', { content: 'Prueba de chat entre dos usuarios' });
    assert.equal((await received)[0].username, users[0].user.username);
    const follow = await api(`/channels/${users[0].user.username}/follow`, {}, users[1].token);
    assert.equal(follow.following, true);
    assert.equal((await api('/following', undefined, users[1].token))[0].username, users[0].user.username);
    await delay(2000);
    const thumbnail = (await api(`/channels/${users[0].user.username}`)).thumbnail;
    assert.match(thumbnail, /^\/thumbnails\//);
    assert((await fetch(`${base}${thumbnail}`)).ok);
    for (const stream of streams) assert.equal((await stream.done)[0], 0, 'publisher must complete successfully');
    await delay(5000);
    for (const user of users) {
      const channel = await api(`/channels/${user.user.username}`);
      assert.equal(channel.isLive, false);
      assert(channel.vods.length > 0);
      const res = await fetch(`${base}${channel.vods[0].url}`, { headers: { Range: 'bytes=0-1023' } });
      assert.equal(res.status, 206);
      assert.equal((await res.arrayBuffer()).byteLength, 1024);
    }
    console.log('PASS: 3 simultaneous RTMP/HLS streams, invalid key, private URLs, thumbnails, 2 viewers, chat, follows, offline state and persistent MP4 range playback');
  } finally {
    streams.forEach(s => { if (s.child.exitCode === null) s.child.kill(); });
    sockets.forEach(s => s.disconnect());
  }
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
