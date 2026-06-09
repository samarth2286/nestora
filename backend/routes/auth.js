import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbGet, dbRun } from '../db.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// Register a new user (Typically done by Admin for residents or staff, or initial signup)
router.post('/register', async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password, and role are required.' });
  }

  if (!['admin', 'resident', 'staff'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  try {
    // Check if user already exists
    const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, phone || null]
    );

    res.status(201).json({
      message: 'User registered successfully.',
      userId: result.id,
      user: { id: result.id, name, email, role, phone }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Sign JWT Token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// Get current logged-in user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Fetch details if resident
    let residentDetails = null;
    if (user.role === 'resident') {
      residentDetails = await dbGet(
        `SELECT r.*, f.wing, f.flat_number 
         FROM residents r 
         LEFT JOIN flats f ON r.flat_id = f.id 
         WHERE r.user_id = ?`,
        [user.id]
      );
    } else if (user.role === 'staff') {
      residentDetails = await dbGet(
        'SELECT * FROM staff WHERE user_id = ?',
        [user.id]
      );
    }

    res.json({
      user,
      profile: residentDetails
    });
  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ message: 'Internal server error fetching profile.' });
  }
});

export default router;
