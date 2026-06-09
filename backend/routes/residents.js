import express from 'express';
import bcrypt from 'bcryptjs';
import { dbAll, dbGet, dbRun } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all residents list (Admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const residents = await dbAll(`
      SELECT r.*, u.name, u.email, u.phone, u.role,
             f.wing, f.flat_number, f.type AS flat_type, f.occupancy_status
      FROM residents r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN flats f ON r.flat_id = f.id
      ORDER BY f.wing, f.flat_number, u.name
    `);
    res.json(residents);
  } catch (error) {
    console.error('Fetch residents error:', error);
    res.status(500).json({ message: 'Error retrieving residents list.' });
  }
});

// Create/Add new Resident (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { name, email, phone, password, flat_id, status, emergency_contact, move_in_date, vehicle_number } = req.body;

  if (!name || !email || !password || !flat_id || !status) {
    return res.status(400).json({ message: 'Name, email, password, flat, and resident status (owner/tenant) are required.' });
  }

  try {
    // Check if user email is unique
    const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Verify flat exists and has space
    const flat = await dbGet('SELECT * FROM flats WHERE id = ?', [flat_id]);
    if (!flat) {
      return res.status(404).json({ message: 'Selected flat not found.' });
    }

    // 1. Create User
    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await dbRun(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, 'resident', phone || null]
    );
    const userId = userResult.id;

    // 2. Create Resident Profile
    await dbRun(
      'INSERT INTO residents (user_id, flat_id, emergency_contact, move_in_date, vehicle_number) VALUES (?, ?, ?, ?, ?)',
      [userId, flat_id, emergency_contact || null, move_in_date || null, vehicle_number || null]
    );

    // 3. Update Flat occupancy
    let updateFlatSql = '';
    let updateParams = [];
    if (status === 'owner') {
      updateFlatSql = 'UPDATE flats SET owner_id = ?, occupancy_status = "occupied_owner" WHERE id = ?';
      updateParams = [userId, flat_id];
    } else { // tenant
      updateFlatSql = 'UPDATE flats SET tenant_id = ?, occupancy_status = "occupied_tenant" WHERE id = ?';
      updateParams = [userId, flat_id];
    }
    await dbRun(updateFlatSql, updateParams);

    res.status(201).json({
      message: 'Resident added successfully and linked to flat.',
      userId,
      flatId: flat_id
    });
  } catch (error) {
    console.error('Add resident error:', error);
    res.status(500).json({ message: 'Error adding resident.' });
  }
});

// Update Resident Profile (Admin or Resident owner)
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { phone, emergency_contact, vehicle_number, move_in_date, name } = req.body;

  try {
    const resident = await dbGet('SELECT * FROM residents WHERE id = ?', [id]);
    if (!resident) {
      return res.status(404).json({ message: 'Resident profile not found.' });
    }

    // Auth check: Admin or the resident user themselves
    if (req.user.role !== 'admin' && req.user.id !== resident.user_id) {
      return res.status(403).json({ message: 'Access denied. You can only update your own profile.' });
    }

    // Update User Name and Phone if provided
    if (name || phone) {
      await dbRun(
        'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?',
        [name, phone, resident.user_id]
      );
    }

    // Update Resident specific fields
    await dbRun(
      `UPDATE residents 
       SET emergency_contact = COALESCE(?, emergency_contact), 
           vehicle_number = COALESCE(?, vehicle_number), 
           move_in_date = COALESCE(?, move_in_date)
       WHERE id = ?`,
      [emergency_contact, vehicle_number, move_in_date, id]
    );

    res.json({ message: 'Resident profile updated successfully.' });
  } catch (error) {
    console.error('Update resident error:', error);
    res.status(500).json({ message: 'Error updating resident profile.' });
  }
});

// Delete Resident / Unlink (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const resident = await dbGet('SELECT * FROM residents WHERE id = ?', [id]);
    if (!resident) {
      return res.status(404).json({ message: 'Resident profile not found.' });
    }

    const userId = resident.user_id;
    const flatId = resident.flat_id;

    // 1. Unlink resident from flat and reset occupancy status if needed
    if (flatId) {
      const flat = await dbGet('SELECT * FROM flats WHERE id = ?', [flatId]);
      if (flat) {
        let ownerId = flat.owner_id;
        let tenantId = flat.tenant_id;
        let status = flat.occupancy_status;

        if (flat.owner_id === userId) {
          ownerId = null;
        }
        if (flat.tenant_id === userId) {
          tenantId = null;
        }

        // recalculate status
        if (tenantId) {
          status = 'occupied_tenant';
        } else if (ownerId) {
          status = 'occupied_owner';
        } else {
          status = 'vacant';
        }

        await dbRun(
          'UPDATE flats SET owner_id = ?, tenant_id = ?, occupancy_status = ? WHERE id = ?',
          [ownerId, tenantId, status, flatId]
        );
      }
    }

    // 2. Delete user (This will cascade delete resident details in DB because of ON DELETE CASCADE on residents.user_id)
    await dbRun('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'Resident deleted successfully and flat updated.' });
  } catch (error) {
    console.error('Delete resident error:', error);
    res.status(500).json({ message: 'Error deleting resident.' });
  }
});

export default router;
