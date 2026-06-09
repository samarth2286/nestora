import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all flats (with filter query params: wing, occupancy_status)
router.get('/', authenticateToken, async (req, res) => {
  const { wing, status } = req.query;
  let sql = `
    SELECT f.*, 
           u_owner.name AS owner_name, u_owner.email AS owner_email, u_owner.phone AS owner_phone,
           u_tenant.name AS tenant_name, u_tenant.email AS tenant_email, u_tenant.phone AS tenant_phone
    FROM flats f
    LEFT JOIN users u_owner ON f.owner_id = u_owner.id
    LEFT JOIN users u_tenant ON f.tenant_id = u_tenant.id
  `;
  const params = [];
  const filters = [];

  if (wing) {
    filters.push('f.wing = ?');
    params.push(wing);
  }
  if (status) {
    filters.push('f.occupancy_status = ?');
    params.push(status);
  }

  if (filters.length > 0) {
    sql += ' WHERE ' + filters.join(' AND ');
  }

  sql += ' ORDER BY f.wing, f.floor, f.flat_number';

  try {
    const flats = await dbAll(sql, params);
    res.json(flats);
  } catch (error) {
    console.error('Fetch flats error:', error);
    res.status(500).json({ message: 'Error retrieving flats.' });
  }
});

// Get single flat details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const flat = await dbGet(
      `SELECT f.*, 
              u_owner.name AS owner_name, u_owner.phone AS owner_phone,
              u_tenant.name AS tenant_name, u_tenant.phone AS tenant_phone
       FROM flats f
       LEFT JOIN users u_owner ON f.owner_id = u_owner.id
       LEFT JOIN users u_tenant ON f.tenant_id = u_tenant.id
       WHERE f.id = ?`,
      [req.params.id]
    );

    if (!flat) {
      return res.status(404).json({ message: 'Flat not found.' });
    }
    res.json(flat);
  } catch (error) {
    console.error('Fetch flat by ID error:', error);
    res.status(500).json({ message: 'Error retrieving flat.' });
  }
});

// Add flat (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { wing, flat_number, floor, type } = req.body;

  if (!wing || !flat_number || !floor || !type) {
    return res.status(400).json({ message: 'Wing, flat number, floor, and type are required.' });
  }

  try {
    // Check uniqueness
    const existing = await dbGet('SELECT * FROM flats WHERE wing = ? AND flat_number = ?', [wing, flat_number]);
    if (existing) {
      return res.status(400).json({ message: 'Flat already exists in this wing.' });
    }

    const result = await dbRun(
      'INSERT INTO flats (wing, flat_number, floor, type, occupancy_status) VALUES (?, ?, ?, ?, ?)',
      [wing, flat_number, floor, type, 'vacant']
    );

    res.status(201).json({
      message: 'Flat added successfully.',
      flatId: result.id
    });
  } catch (error) {
    console.error('Add flat error:', error);
    res.status(500).json({ message: 'Error adding flat.' });
  }
});

// Update flat / Assign owner or tenant (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { wing, flat_number, floor, type, owner_id, tenant_id } = req.body;

  try {
    const flat = await dbGet('SELECT * FROM flats WHERE id = ?', [req.params.id]);
    if (!flat) {
      return res.status(404).json({ message: 'Flat not found.' });
    }

    // Determine occupancy status automatically
    let status = 'vacant';
    if (tenant_id) {
      status = 'occupied_tenant';
    } else if (owner_id) {
      status = 'occupied_owner';
    }

    await dbRun(
      `UPDATE flats 
       SET wing = ?, flat_number = ?, floor = ?, type = ?, occupancy_status = ?, owner_id = ?, tenant_id = ?
       WHERE id = ?`,
      [
        wing || flat.wing,
        flat_number || flat.flat_number,
        floor !== undefined ? floor : flat.floor,
        type || flat.type,
        status,
        owner_id !== undefined ? owner_id : flat.owner_id,
        tenant_id !== undefined ? tenant_id : flat.tenant_id,
        req.params.id
      ]
    );

    res.json({ message: 'Flat details updated successfully.' });
  } catch (error) {
    console.error('Update flat error:', error);
    res.status(500).json({ message: 'Error updating flat.' });
  }
});

export default router;
