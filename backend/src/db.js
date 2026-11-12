const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

let pool = null;
let usePg = false;

// Fallback in-memory / JSON file storage
const LOCAL_DB_PATH = process.env.LOCAL_DB_PATH || path.join(__dirname, '../data/local_db.json');

const memoryDb = {
  users: [],
  channels: [],
  messages: [],
  follows: []
};

function ensureLocalDir() {
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveLocalDb() {
  try {
    ensureLocalDir();
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(memoryDb, null, 2));
  } catch (err) {
    console.error('Error saving local db:', err.message);
  }
}

function loadLocalDb() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      memoryDb.users = parsed.users || [];
      memoryDb.channels = parsed.channels || [];
      memoryDb.messages = parsed.messages || [];
      memoryDb.follows = parsed.follows || [];
      console.log('📦 Base de datos local cargada:', memoryDb.users.length, 'usuarios,', memoryDb.channels.length, 'canales.');
    }
  } catch (err) {
    console.error('Error loading local db, using initial state:', err.message);
  }
}

async function seedInitialData() {
  if (process.env.SEED_DEMO === 'false') return;
  if (!usePg && memoryDb.users.length > 0) return;

  const defaultPassword = await bcrypt.hash('password123', 10);
  
  const seedUsers = [
    {
      id: uuidv4(),
      username: 'cloud_streamer',
      displayName: 'Cloud Streamer MX',
      email: 'streamer@twitchnt.com',
      password: defaultPassword,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=cloud_streamer',
      bio: 'Transmitiendo proyectos de Cómputo en la Nube y Kubernetes en vivo!',
      role: 'streamer'
    },
    {
      id: uuidv4(),
      username: 'tecnm_gaming',
      displayName: 'TecNM Gaming Hub',
      email: 'gaming@twitchnt.com',
      password: defaultPassword,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tecnm_gaming',
      bio: 'Torneos de programación y videojuegos universitarios.',
      role: 'streamer'
    },
    {
      id: uuidv4(),
      username: 'chill_coder',
      displayName: 'Chill Coder Lo-Fi',
      email: 'chill@twitchnt.com',
      password: defaultPassword,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=chill_coder',
      bio: 'Música Lo-Fi y sesiones de pair programming.',
      role: 'streamer'
    }
  ];

  const seedChannels = [
    {
      id: uuidv4(),
      userId: seedUsers[0].id,
      username: seedUsers[0].username,
      title: '🔴 Desplegando Cluster de Kubernetes con Microservicios en Vivo',
      category: 'Software & Game Development',
      streamKey: 'live_streamkey_cloud_123',
      isLive: false,
      viewerCount: 142,
      thumbnail: 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=800&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      userId: seedUsers[1].id,
      username: seedUsers[1].username,
      title: '🏆 Gran Final Torneo TecNM de Valorant & Rocket League',
      category: 'Gaming',
      streamKey: 'live_streamkey_tecnm_456',
      isLive: false,
      viewerCount: 89,
      thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      userId: seedUsers[2].id,
      username: seedUsers[2].username,
      title: '☕ Lo-Fi Beats + Programando en Rust y React',
      category: 'Just Chatting',
      streamKey: 'live_streamkey_chill_789',
      isLive: false,
      viewerCount: 54,
      thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString()
    }
  ];

  if (usePg && pool) {
    for (const u of seedUsers) {
      await pool.query(
        'INSERT INTO users (id, username, display_name, email, password, avatar, bio, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING',
        [u.id, u.username, u.displayName, u.email, u.password, u.avatar, u.bio, u.role]
      );
    }
    for (const c of seedChannels) {
      await pool.query(
        'INSERT INTO channels (id, user_id, username, title, category, stream_key, is_live, viewer_count, thumbnail) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING',
        [c.id, c.userId, c.username, c.title, c.category, c.streamKey, c.isLive, c.viewerCount, c.thumbnail]
      );
    }
    console.log('✅ Usuarios y canales iniciales sembrados en PostgreSQL.');
    return;
  }

  memoryDb.users.push(...seedUsers);
  memoryDb.channels.push(...seedChannels);

  // Initial chat messages
  memoryDb.messages.push(
    {
      id: uuidv4(),
      channelId: seedChannels[0].id,
      username: 'admin',
      displayName: 'Twitchnt Bot',
      content: '¡Bienvenidos al stream en vivo! Recuerden seguir las normas de la comunidad.',
      color: '#9146ff',
      badge: 'MOD',
      createdAt: new Date(Date.now() - 60000).toISOString()
    },
    {
      id: uuidv4(),
      channelId: seedChannels[0].id,
      username: 'cloud_fan',
      displayName: 'CloudFan',
      content: '¡Qué buen proyecto para la materia de Cómputo en la Nube!',
      color: '#00e5ff',
      badge: null,
      createdAt: new Date(Date.now() - 30000).toISOString()
    }
  );

  saveLocalDb();
}

async function initDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    try {
      pool = new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 5000
      });
      // Test connection
      await pool.query('SELECT NOW()');
      usePg = true;
      console.log('✅ Conectado a PostgreSQL exitosamente.');

      // Create tables if not exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          display_name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          avatar TEXT,
          bio TEXT,
          role VARCHAR(20) DEFAULT 'user',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS channels (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          username VARCHAR(50) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(100) DEFAULT 'Just Chatting',
          stream_key VARCHAR(100) UNIQUE NOT NULL,
          is_live BOOLEAN DEFAULT FALSE,
          viewer_count INT DEFAULT 0,
          thumbnail TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS messages (
          id VARCHAR(64) PRIMARY KEY,
          channel_id VARCHAR(64) REFERENCES channels(id) ON DELETE CASCADE,
          username VARCHAR(50) NOT NULL,
          display_name VARCHAR(100) NOT NULL,
          content TEXT NOT NULL,
          color VARCHAR(20) DEFAULT '#9146ff',
          badge VARCHAR(20),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS follows (
          user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
          channel_id VARCHAR(64) REFERENCES channels(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, channel_id)
        );
        ALTER TABLE channels ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
      `);
      console.log('✅ Tablas de PostgreSQL verificadas/creadas.');

      // Check if PostgreSQL has users; if empty, seed default channels
      const countRes = await pool.query('SELECT COUNT(*) FROM users');
      if (parseInt(countRes.rows[0].count, 10) === 0) {
        console.log('🌱 Sembrando datos iniciales en PostgreSQL...');
        await seedInitialData();
      }
      return;
    } catch (err) {
      console.warn('⚠️ No se pudo conectar a PostgreSQL (' + err.message + '). Usando almacenamiento local persistente.');
      throw err;
    }
  }

  loadLocalDb();
  await seedInitialData();
}

// Database Operations
const db = {
  initDb,

  async following(userId) {
    if (usePg) return (await pool.query('SELECT channel_id FROM follows WHERE user_id = $1', [userId])).rows.map(r => r.channel_id);
    return memoryDb.follows.filter(f => f.userId === userId).map(f => f.channelId);
  },

  async followers(channelId) {
    if (usePg) return Number((await pool.query('SELECT COUNT(*) FROM follows WHERE channel_id = $1', [channelId])).rows[0].count);
    return memoryDb.follows.filter(f => f.channelId === channelId).length;
  },

  async toggleFollow(userId, channelId) {
    if (usePg) {
      const deleted = await pool.query('DELETE FROM follows WHERE user_id = $1 AND channel_id = $2 RETURNING channel_id', [userId, channelId]);
      if (deleted.rowCount) return false;
      await pool.query('INSERT INTO follows (user_id, channel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, channelId]);
      return true;
    }
    const index = memoryDb.follows.findIndex(f => f.userId === userId && f.channelId === channelId);
    if (index < 0) memoryDb.follows.push({ userId, channelId });
    else memoryDb.follows.splice(index, 1);
    saveLocalDb();
    return index < 0;
  },

  async findUserByUsername(username) {
    if (usePg) {
      const res = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
      if (!res.rows[0]) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        email: r.email,
        password: r.password,
        avatar: r.avatar,
        bio: r.bio,
        role: r.role
      };
    }
    return memoryDb.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  },

  async findUserByEmail(email) {
    if (usePg) {
      const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (!res.rows[0]) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        email: r.email,
        password: r.password,
        avatar: r.avatar,
        bio: r.bio,
        role: r.role
      };
    }
    return memoryDb.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserById(id) {
    if (usePg) {
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (!res.rows[0]) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        email: r.email,
        password: r.password,
        avatar: r.avatar,
        bio: r.bio,
        role: r.role
      };
    }
    return memoryDb.users.find(u => u.id === id) || null;
  },

  async createUser({ username, displayName, email, password, avatar, bio }) {
    const user = {
      id: uuidv4(),
      username,
      displayName: displayName || username,
      email,
      password,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      bio: bio || '',
      role: 'user'
    };

    if (usePg) {
      await pool.query(
        'INSERT INTO users (id, username, display_name, email, password, avatar, bio, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [user.id, user.username, user.displayName, user.email, user.password, user.avatar, user.bio, user.role]
      );
    } else {
      memoryDb.users.push(user);
      saveLocalDb();
    }
    return user;
  },

  async findChannelByUsername(username) {
    if (usePg) {
      const res = await pool.query('SELECT * FROM channels WHERE LOWER(username) = LOWER($1)', [username]);
      if (!res.rows[0]) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        userId: r.user_id,
        username: r.username,
        title: r.title,
        category: r.category,
        streamKey: r.stream_key,
        isLive: r.is_live,
        viewerCount: r.viewer_count,
        thumbnail: r.thumbnail,
        description: r.description || '',
        createdAt: r.created_at
      };
    }
    return memoryDb.channels.find(c => c.username.toLowerCase() === username.toLowerCase()) || null;
  },

  async findChannelByStreamKey(streamKey) {
    if (usePg) {
      const res = await pool.query('SELECT * FROM channels WHERE stream_key = $1', [streamKey]);
      if (!res.rows[0]) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        userId: r.user_id,
        username: r.username,
        title: r.title,
        category: r.category,
        streamKey: r.stream_key,
        isLive: r.is_live,
        viewerCount: r.viewer_count,
        thumbnail: r.thumbnail,
        description: r.description || ''
      };
    }
    return memoryDb.channels.find(c => c.streamKey === streamKey) || null;
  },

  async createChannel({ userId, username, title, category }) {
    const channel = {
      id: uuidv4(),
      userId,
      username,
      title: title || `¡Canal de ${username} en vivo!`,
      category: category || 'Just Chatting',
      streamKey: `live_${uuidv4().replace(/-/g, '')}`,
      isLive: false,
      viewerCount: 0,
      thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString()
    };

    if (usePg) {
      await pool.query(
        'INSERT INTO channels (id, user_id, username, title, category, stream_key, is_live, viewer_count, thumbnail) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [channel.id, channel.userId, channel.username, channel.title, channel.category, channel.streamKey, channel.isLive, channel.viewerCount, channel.thumbnail]
      );
    } else {
      memoryDb.channels.push(channel);
      saveLocalDb();
    }
    return channel;
  },

  async updateChannel(channelId, fields) {
    if (usePg) {
      const keys = Object.keys(fields);
      if (keys.length === 0) return;
      const colMap = {
        title: 'title',
        category: 'category',
        isLive: 'is_live',
        viewerCount: 'viewer_count',
        streamKey: 'stream_key',
        thumbnail: 'thumbnail',
        description: 'description'
      };
      const setClauses = [];
      const values = [];
      let idx = 1;
      for (const k of keys) {
        if (colMap[k]) {
          setClauses.push(`${colMap[k]} = $${idx}`);
          values.push(fields[k]);
          idx++;
        }
      }
      setClauses.push(`updated_at = NOW()`);
      values.push(channelId);
      await pool.query(`UPDATE channels SET ${setClauses.join(', ')} WHERE id = $${idx}`, values);
    } else {
      const ch = memoryDb.channels.find(c => c.id === channelId);
      if (ch) {
        Object.assign(ch, fields);
        saveLocalDb();
      }
    }
  },

  async listChannels() {
    if (usePg) {
      const res = await pool.query(`
        SELECT c.*, u.display_name, u.avatar, u.bio
        FROM channels c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.is_live DESC, c.viewer_count DESC, c.created_at DESC
      `);
      return res.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        title: r.title,
        category: r.category,
        streamKey: r.stream_key,
        isLive: r.is_live,
        viewerCount: r.viewer_count,
        thumbnail: r.thumbnail,
        displayName: r.display_name || r.username,
        avatar: r.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${r.username}`,
        bio: r.bio || ''
      }));
    }

    return memoryDb.channels.map(c => {
      const user = memoryDb.users.find(u => u.id === c.userId);
      return {
        ...c,
        displayName: user ? user.displayName : c.username,
        avatar: user ? user.avatar : `https://api.dicebear.com/7.x/bottts/svg?seed=${c.username}`,
        bio: user ? user.bio : ''
      };
    }).sort((a, b) => (b.isLive ? 1 : 0) - (a.isLive ? 1 : 0) || b.viewerCount - a.viewerCount);
  },

  async getMessagesByChannelId(channelId, limit = 50) {
    if (usePg) {
      const res = await pool.query(
        'SELECT * FROM messages WHERE channel_id = $1 ORDER BY created_at ASC LIMIT $2',
        [channelId, limit]
      );
      return res.rows.map(r => ({
        id: r.id,
        channelId: r.channel_id,
        username: r.username,
        displayName: r.display_name,
        content: r.content,
        color: r.color,
        badge: r.badge,
        createdAt: r.created_at
      }));
    }

    return memoryDb.messages
      .filter(m => m.channelId === channelId)
      .slice(-limit);
  },

  async addMessage({ channelId, username, displayName, content, color, badge }) {
    const msg = {
      id: uuidv4(),
      channelId,
      username,
      displayName: displayName || username,
      content,
      color: color || '#9146ff',
      badge: badge || null,
      createdAt: new Date().toISOString()
    };

    if (usePg) {
      await pool.query(
        'INSERT INTO messages (id, channel_id, username, display_name, content, color, badge, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [msg.id, msg.channelId, msg.username, msg.displayName, msg.content, msg.color, msg.badge, msg.createdAt]
      );
    } else {
      memoryDb.messages.push(msg);
      // Keep max 500 messages
      if (memoryDb.messages.length > 500) {
        memoryDb.messages = memoryDb.messages.slice(-500);
      }
      saveLocalDb();
    }
    return msg;
  }
};

module.exports = db;
