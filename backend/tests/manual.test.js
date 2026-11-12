const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { io } = require('../../frontend/node_modules/socket.io-client');
const { once } = require('node:events');
const event = (socket, name) => Promise.race([once(socket, name), new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${name}`)), 3000).unref())]);

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'twitchnt-test-'));
  const server = spawn(process.execPath, [path.join(__dirname, '../src/server.js')], {
    env: { ...process.env, PORT: '15001', DATABASE_URL: '', LOCAL_DB_PATH: path.join(dir, 'db.json'), JWT_SECRET: 'isolated-test-secret', SEED_DEMO: 'false' },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  let errors = '';
  server.stderr.on('data', d => { errors += d; });
  const call = async (url, method = 'GET', body, token) => {
    const res = await fetch(`http://127.0.0.1:15001/api${url}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: res.status, data: await res.text().then(t => { try { return JSON.parse(t); } catch { return t; } }) };
  };
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch('http://127.0.0.1:15001/health')).ok) { ready = true; break; } } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
    assert(ready, errors);
    const register = username => call('/auth/register', 'POST', { username, email: `${username}@example.com`, password: 'password123' });
    const owner = (await register('owner')).data;
    const fan = (await register('viewer')).data;
    assert(owner.token && fan.token);
    assert.equal((await register('x')).status, 400);
    assert.equal((await call('/channels/owner')).data.streamKey, undefined, 'public channel must never reveal stream key');
    assert.equal((await call('/mediamtx/auth', 'POST', { action: 'publish', path: 'live/owner' })).status, 401);
    assert.equal((await call('/mediamtx/auth', 'POST', { action: 'publish', path: 'live/owner', query: `key=${owner.channel.streamKey}` })).status, 200);
    assert.equal((await call('/mediamtx/auth', 'POST', { action: 'publish', path: 'live/viewer', query: `key=${owner.channel.streamKey}` })).status, 401);
    assert.equal((await call('/channels/owner/follow', 'POST', {}, owner.token)).status, 400);
    assert.equal((await call('/channels/owner/follow', 'POST', {}, fan.token)).data.following, true);
    assert.equal((await call('/following', 'GET', undefined, fan.token)).data[0].username, 'owner');
    assert.equal((await call('/channels/owner')).data.followers, 1);
    const metadata = await call('/channels/owner', 'PUT', { title: 'Título de prueba', category: 'Música', description: 'Descripción persistente' }, owner.token);
    assert.equal(metadata.status, 200);
    assert.equal((await call('/channels/owner')).data.description, 'Descripción persistente');
    assert.equal((await call('/channels/owner', 'PUT', { title: [] }, owner.token)).status, 400);
    assert.equal((await call('/channels/owner/follow', 'POST', {}, fan.token)).data.following, false);
    assert.equal((await call('/following', 'GET', undefined, fan.token)).data.length, 0);
    const regenerated = await call('/channels/owner/regenerate-key', 'POST', {}, owner.token);
    assert.notEqual(regenerated.data.streamKey, owner.channel.streamKey);
    assert.equal((await call('/mediamtx/auth', 'POST', { action: 'publish', path: 'live/owner', query: `key=${owner.channel.streamKey}` })).status, 401);
    assert.equal((await call('/mediamtx/toggle-live/owner', 'POST', {})).status, 404);
    const sockets = [io('http://127.0.0.1:15001', { auth: { token: fan.token }, forceNew: true }), io('http://127.0.0.1:15001', { forceNew: true })];
    try {
      await Promise.all(sockets.map(s => event(s, 'connect')));
      const firstCount = event(sockets[0], 'viewer_count_update');
      sockets[0].emit('join_channel', { channelUsername: 'owner', user: { username: 'owner', role: 'admin' } });
      assert.equal((await firstCount)[0].count, 1);
      const secondCount = event(sockets[0], 'viewer_count_update');
      sockets[1].emit('join_channel', { channelUsername: 'owner' });
      assert.equal((await secondCount)[0].count, 2);
      const anonymousError = event(sockets[1], 'chat:error');
      sockets[1].emit('send_message', { content: 'forged', user: { username: 'owner' } });
      assert.match((await anonymousError)[0], /Inicia sesión/);
      const message = event(sockets[1], 'receive_message');
      sockets[0].emit('send_message', { content: 'Hola', user: { username: 'owner', role: 'admin' } });
      const received = (await message)[0];
      assert.equal(received.username, 'viewer');
      assert.equal(received.badge, null);
      const spam = event(sockets[0], 'chat:error');
      sockets[0].emit('send_message', { content: 'spam' });
      assert.match((await spam)[0], /700/);
      const left = event(sockets[0], 'viewer_count_update');
      sockets[1].disconnect();
      assert.equal((await left)[0].count, 1);
      console.log('PASS: authenticated chat, impersonation rejection, anti-spam and viewer join/disconnect');
    } finally { sockets.forEach(s => s.disconnect()); }
    console.log('PASS: registration, private keys, RTMP authorization, follows, regeneration and disabled simulation');
  } finally {
    server.kill();
    await new Promise(resolve => server.once('exit', resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
