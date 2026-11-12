const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en producción');
}

// Middleware for JWT verification
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token faltante' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, displayName, email, password } = req.body;

    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Usuario, correo y contraseña son requeridos' });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername) || password.length < 6 || Buffer.byteLength(password) > 72 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Usuario: 3-20 letras, números o _. Contraseña: 6-72 bytes. Correo válido requerido.' });
    }

    const existingUser = await db.findUserByUsername(cleanUsername);
    if (existingUser) {
      return res.status(409).json({ error: 'El nombre de usuario ya está registrado' });
    }

    const existingEmail = await db.findUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'El correo electrónico ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.createUser({
      username: cleanUsername,
      displayName: displayName || cleanUsername,
      email,
      password: hashedPassword
    });

    // Automatically create a channel for the new user
    const channel = await db.createChannel({
      userId: user.id,
      username: user.username,
      title: `¡Canal en vivo de ${user.displayName}!`,
      category: 'Just Chatting'
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Usuario registrado con éxito',
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role
      },
      channel
    });
  } catch (err) {
    console.error('Error in /register:', err);
    res.status(500).json({ error: 'Error interno del servidor al registrar usuario' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const user = await db.findUserByUsername(username.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const channel = await db.findChannelByUsername(user.username);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role
      },
      channel
    });
  } catch (err) {
    console.error('Error in /login:', err);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const channel = await db.findChannelByUsername(user.username);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role
      },
      channel
    });
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ error: 'Error al obtener datos del usuario autenticado' });
  }
});

module.exports = {
  router,
  authenticateToken,
  JWT_SECRET
};
