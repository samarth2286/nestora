import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get complaints list
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT c.*, u.name AS resident_name, u.phone AS resident_phone,
             f.wing, f.flat_number,
             s.name AS staff_name, s.role AS staff_role
      FROM complaints c
      JOIN users u ON c.resident_id = u.id
      LEFT JOIN residents r ON u.id = r.user_id
      LEFT JOIN flats f ON r.flat_id = f.id
      LEFT JOIN staff s ON c.assigned_staff_id = s.id
    `;
    const params = [];

    // Residents can only see their own complaints
    if (req.user.role === 'resident') {
      sql += ' WHERE c.resident_id = ?';
      params.push(req.user.id);
    }
    // Staff can see all, or only those assigned to them (Let's show all for simplicity, but filterable)
    else if (req.user.role === 'staff') {
      // Find staff profile associated with current user
      const staffProfile = await dbGet('SELECT id FROM staff WHERE user_id = ?', [req.user.id]);
      if (staffProfile) {
        sql += ' WHERE c.assigned_staff_id = ? OR c.assigned_staff_id IS NULL';
        params.push(staffProfile.id);
      }
    }

    sql += ' ORDER BY c.created_at DESC';

    const complaints = await dbAll(sql, params);
    res.json(complaints);
  } catch (error) {
    console.error('Fetch complaints error:', error);
    res.status(500).json({ message: 'Error retrieving complaints.' });
  }
});

// Lodge a new complaint (Resident only)
router.post('/', authenticateToken, async (req, res) => {
  const { title, description, category, urgency } = req.body;

  if (req.user.role !== 'resident') {
    return res.status(403).json({ message: 'Only residents can file complaints.' });
  }

  if (!title || !description || !category) {
    return res.status(400).json({ message: 'Title, description, and category are required.' });
  }

  if (!['plumbing', 'electrical', 'security', 'cleaning', 'general'].includes(category)) {
    return res.status(400).json({ message: 'Invalid category.' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO complaints (resident_id, title, description, category, urgency, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description, category, urgency || 'medium', 'open']
    );

    res.status(201).json({
      message: 'Complaint submitted successfully.',
      complaintId: result.id
    });
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ message: 'Error submitting complaint.' });
  }
});

// Assign staff to a complaint (Admin only)
router.put('/:id/assign', authenticateToken, async (req, res) => {
  const { assigned_staff_id } = req.body;
  const complaintId = req.params.id;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can assign staff.' });
  }

  try {
    const complaint = await dbGet('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    if (assigned_staff_id) {
      const staff = await dbGet('SELECT * FROM staff WHERE id = ?', [assigned_staff_id]);
      if (!staff) {
        return res.status(404).json({ message: 'Staff member not found.' });
      }
    }

    await dbRun(
      'UPDATE complaints SET assigned_staff_id = ?, status = "in_progress", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [assigned_staff_id || null, complaintId]
    );

    res.json({ message: 'Complaint assigned successfully.' });
  } catch (error) {
    console.error('Assign staff error:', error);
    res.status(500).json({ message: 'Error assigning staff.' });
  }
});

// Update complaint status (Admin, Assigned Staff, or the Owner Resident)
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const complaintId = req.params.id;

  if (!status || !['open', 'in_progress', 'resolved'].includes(status)) {
    return res.status(400).json({ message: 'Invalid or missing status.' });
  }

  try {
    const complaint = await dbGet('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    // Authorization checks
    let authorized = false;

    if (req.user.role === 'admin') {
      authorized = true;
    } else if (req.user.role === 'resident' && complaint.resident_id === req.user.id) {
      authorized = true; // Resident can close/update their own complaint
    } else if (req.user.role === 'staff') {
      // Check if this staff member is assigned to it
      const staffProfile = await dbGet('SELECT id FROM staff WHERE user_id = ?', [req.user.id]);
      if (staffProfile && complaint.assigned_staff_id === staffProfile.id) {
        authorized = true;
      }
    }

    if (!authorized) {
      return res.status(403).json({ message: 'You do not have permission to update this complaint.' });
    }

    await dbRun(
      'UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, complaintId]
    );

    res.json({ message: 'Complaint status updated successfully.' });
  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({ message: 'Error updating status.' });
  }
});

export default router;
