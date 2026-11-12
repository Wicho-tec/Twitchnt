/**
 * Integration Test Suite for Twitchnt Backend API
 * Tests Auth, Channels, MediaMTX Webhooks, and Chat
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data, data: null });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Iniciando pruebas de integración de Twitchnt API...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASÓ: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/health',
      method: 'GET'
    });
    assert(health.status === 200 && health.data?.status === 'healthy', 'GET /health responde con estado "healthy"');

    // 2. Channels list
    const channels = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/channels',
      method: 'GET'
    });
    assert(channels.status === 200 && Array.isArray(channels.data) && channels.data.length >= 3, 'GET /api/channels devuelve canales iniciales');

    // 3. Login with seed user
    const login = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      username: 'cloud_streamer',
      password: 'password123'
    });
    assert(login.status === 200 && login.data?.token, 'POST /api/auth/login autentica a cloud_streamer y genera JWT');

    const token = login.data?.token;
    const channelKey = login.data?.channel?.streamKey;

    // 4. Authenticated /me
    const me = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert(me.status === 200 && me.data?.user?.username === 'cloud_streamer', 'GET /api/auth/me devuelve datos del usuario autenticado');

    // 5. MediaMTX Webhook Auth validation with valid streamKey
    const validAuth = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/mediamtx/auth',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      action: 'publish',
      path: 'live/' + channelKey,
      query: 'key=' + channelKey
    });
    assert(validAuth.status === 200, 'POST /api/mediamtx/auth autoriza stream con StreamKey válida');

    // 6. MediaMTX Webhook Auth validation with INVALID streamKey
    const invalidAuth = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/mediamtx/auth',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      action: 'publish',
      path: 'live/fake_invalid_key_999',
      query: 'key=fake_invalid_key_999'
    });
    assert(invalidAuth.status === 401, 'POST /api/mediamtx/auth rechaza stream no autorizado con HTTP 401');

    // 7. Toggle live simulation
    const toggle = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/mediamtx/toggle-live/cloud_streamer',
      method: 'POST'
    });
    assert(toggle.status === 200 && typeof toggle.data?.isLive === 'boolean', 'POST /api/mediamtx/toggle-live conmuta el estado en vivo');

    // 8. Fetch chat messages
    const messages = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/channels/cloud_streamer/messages',
      method: 'GET'
    });
    assert(messages.status === 200 && Array.isArray(messages.data), 'GET /api/channels/:username/messages devuelve historial de chat');

    console.log(`\n📊 Resumen de pruebas: ${passed} pasadas, ${failed} fallidas.`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Error durante la ejecución de las pruebas:', err.message);
    process.exit(1);
  }
}

// If executed directly, run tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
