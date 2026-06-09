import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get visitor logs (Admins & Staff see all, Residents see visitors for their flat)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT v.*, f.wing, f.flat_number, f.type AS flat_type,
             u_owner.name AS owner_name, u_tenant.name AS tenant_name,
             u_guard.name AS logger_name
      FROM visitors v
      JOIN flats f ON v.flat_id = f.id
      LEFT JOIN users u_owner ON f.owner_id = u_owner.id
      LEFT JOIN users u_tenant ON f.tenant_id = u_tenant.id
      LEFT JOIN users u_guard ON v.created_by = u_guard.id
    `;
    const params = [];

    if (req.user.role === 'resident') {
      sql += ' WHERE (f.owner_id = ? OR f.tenant_id = ?)';
      params.push(req.user.id, req.user.id);
    }

    sql += ' ORDER BY v.status DESC, v.entry_time DESC';

    const visitors = await dbAll(sql, params);
    res.json(visitors);
  } catch (error) {
    console.error('Fetch visitors error:', error);
    res.status(500).json({ message: 'Error retrieving visitor log.' });
  }
});

// Check-in a new visitor (Staff/Guard or Admin only)
router.post('/', authenticateToken, async (req, res) => {
  const { name, phone, flat_id, purpose, vehicle_number } = req.body;

  if (req.user.role !== 'staff' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Only guards/admins can check-in visitors.' });
  }

  if (!name || !phone || !flat_id || !purpose) {
    return res.status(400).json({ message: 'Name, phone, flat, and purpose are required.' });
  }

  try {
    const flat = await dbGet('SELECT id FROM flats WHERE id = ?', [flat_id]);
    if (!flat) {
      return res.status(404).json({ message: 'Target flat not found.' });
    }

    const entryTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const result = await dbRun(
      `INSERT INTO visitors (name, phone, flat_id, purpose, vehicle_number, entry_time, status, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, "inside", ?)`,
      [name, phone, flat_id, purpose, vehicle_number || null, entryTime, req.user.id]
    );

    res.status(201).json({
      message: 'Visitor checked in successfully.',
      visitorId: result.id
    });
  } catch (error) {
    console.error('Check-in visitor error:', error);
    res.status(500).json({ message: 'Error checking in visitor.' });
  }
});

// Pre-approve a visitor (Resident only)
router.post('/pre-approve', authenticateToken, async (req, res) => {
  const { name, phone, purpose, flat_id, vehicle_number } = req.body;

  if (req.user.role !== 'resident') {
    return res.status(403).json({ message: 'Only residents can pre-approve visitors.' });
  }

  if (!name || !phone || !purpose || !flat_id) {
    return res.status(400).json({ message: 'Name, phone, purpose, and flat are required.' });
  }

  try {
    // Verify resident is linked to flat
    const flat = await dbGet('SELECT * FROM flats WHERE id = ?', [flat_id]);
    if (!flat) {
      return res.status(404).json({ message: 'Flat not found.' });
    }

    if (flat.owner_id !== req.user.id && flat.tenant_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only pre-approve visitors for your own flat.' });
    }

    const result = await dbRun(
      `INSERT INTO visitors (name, phone, flat_id, purpose, vehicle_number, status, created_by) 
       VALUES (?, ?, ?, ?, ?, "pre_approved", ?)`,
      [name, phone, flat_id, purpose, vehicle_number || null, req.user.id]
    );

    res.status(201).json({
      message: 'Visitor pre-approved successfully.',
      visitorId: result.id
    });
  } catch (error) {
    console.error('Pre-approve visitor error:', error);
    res.status(500).json({ message: 'Error logging pre-approval.' });
  }
});

// Check-out a visitor or Check-in a pre-approved visitor (Staff/Guard or Admin)
router.put('/:id/checkout', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'staff' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const visitor = await dbGet('SELECT * FROM visitors WHERE id = ?', [id]);
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor record not found.' });
    }

    if (visitor.status === 'exited') {
      return res.status(400).json({ message: 'Visitor has already checked out.' });
    }

    const exitTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await dbRun(
      'UPDATE visitors SET status = "exited", exit_time = ? WHERE id = ?',
      [exitTime, id]
    );

    res.json({ message: 'Visitor checked out successfully.' });
  } catch (error) {
    console.error('Check-out visitor error:', error);
    res.status(500).json({ message: 'Error checking out visitor.' });
  }
});

// Approve a pre-approved visitor entry (Staff/Guard when they actually arrive)
router.put('/:id/approve-entry', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'staff' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const visitor = await dbGet('SELECT * FROM visitors WHERE id = ?', [id]);
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor record not found.' });
    }

    if (visitor.status !== 'pre_approved') {
      return res.status(400).json({ message: 'Visitor is not in pre-approved status.' });
    }

    const entryTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await dbRun(
      'UPDATE visitors SET status = "inside", entry_time = ?, created_by = ? WHERE id = ?',
      [entryTime, req.user.id, id]
    );

    res.json({ message: 'Pre-approved visitor entry logged successfully.' });
  } catch (error) {
    console.error('Approve entry error:', error);
    res.status(500).json({ message: 'Error processing visitor entry.' });
  }
});

export default router;
