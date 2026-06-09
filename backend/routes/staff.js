import express from 'express';
import bcrypt from 'bcryptjs';
import { dbAll, dbGet, dbRun } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get staff list (Authenticated users can view directory, e.g. Plumbers, Electricians)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const staff = await dbAll(`
      SELECT s.*, u.email 
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.role, s.name
    `);
    res.json(staff);
  } catch (error) {
    console.error('Fetch staff error:', error);
    res.status(500).json({ message: 'Error retrieving staff list.' });
  }
});

// Add staff (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { name, role, phone, shift, status, email, password } = req.body;

  if (!name || !role || !phone) {
    return res.status(400).json({ message: 'Name, role, and phone are required.' });
  }

  try {
    let userId = null;

    // If email is provided, create a user account for them (e.g. security guard who logs visitors)
    if (email) {
      if (!password) {
        return res.status(400).json({ message: 'Password is required if email is provided.' });
      }

      // Check if user already exists
      const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userResult = await dbRun(
        'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
        [name, email, passwordHash, 'staff', phone]
      );
      userId = userResult.id;
    }

    const result = await dbRun(
      'INSERT INTO staff (user_id, name, role, phone, shift, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, name, role, phone, shift || 'general', status || 'active']
    );

    res.status(201).json({
      message: 'Staff profile created successfully.',
      staffId: result.id,
      userId
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ message: 'Error creating staff profile.' });
  }
});

// Update staff details (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { name, role, phone, shift, status } = req.body;

  try {
    const staff = await dbGet('SELECT * FROM staff WHERE id = ?', [id]);
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found.' });
    }

    await dbRun(
      `UPDATE staff 
       SET name = COALESCE(?, name),
           role = COALESCE(?, role),
           phone = COALESCE(?, phone),
           shift = COALESCE(?, shift),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [name, role, phone, shift, status, id]
    );

    // If linked to a user account, update user details too
    if (staff.user_id && (name || phone)) {
      await dbRun(
        'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?',
        [name, phone, staff.user_id]
      );
    }

    res.json({ message: 'Staff details updated successfully.' });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ message: 'Error updating staff details.' });
  }
});

// Delete staff (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const staff = await dbGet('SELECT * FROM staff WHERE id = ?', [id]);
    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found.' });
    }

    const userId = staff.user_id;

    // 1. Delete staff record
    await dbRun('DELETE FROM staff WHERE id = ?', [id]);

    // 2. If staff had a user account, delete it too
    if (userId) {
      await dbRun('DELETE FROM users WHERE id = ?', [userId]);
    }

    res.json({ message: 'Staff member deleted successfully.' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ message: 'Error deleting staff member.' });
  }
});

export default router;
