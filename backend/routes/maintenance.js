import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get maintenance bills
router.get('/', authenticateToken, async (req, res) => {
  const { status } = req.query;

  try {
    let sql = `
      SELECT mb.*, f.wing, f.flat_number, f.type AS flat_type, f.occupancy_status,
             u_owner.name AS owner_name, u_tenant.name AS tenant_name
      FROM maintenance_bills mb
      JOIN flats f ON mb.flat_id = f.id
      LEFT JOIN users u_owner ON f.owner_id = u_owner.id
      LEFT JOIN users u_tenant ON f.tenant_id = u_tenant.id
    `;
    const params = [];
    const filters = [];

    // If resident, restrict to their flats only
    if (req.user.role === 'resident') {
      filters.push('(f.owner_id = ? OR f.tenant_id = ?)');
      params.push(req.user.id, req.user.id);
    }

    if (status) {
      filters.push('mb.status = ?');
      params.push(status);
    }

    if (filters.length > 0) {
      sql += ' WHERE ' + filters.join(' AND ');
    }

    sql += ' ORDER BY mb.due_date DESC, f.wing, f.flat_number';

    const bills = await dbAll(sql, params);
    res.json(bills);
  } catch (error) {
    console.error('Fetch bills error:', error);
    res.status(500).json({ message: 'Error retrieving maintenance bills.' });
  }
});

// Generate maintenance bills (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { flat_id, title, amount, due_date, scope } = req.body; // scope = 'single' or 'bulk_occupied'

  if (!title || !amount || !due_date) {
    return res.status(400).json({ message: 'Title, amount, and due date are required.' });
  }

  try {
    if (scope === 'bulk_occupied') {
      // Find all occupied flats
      const occupiedFlats = await dbAll(
        'SELECT id FROM flats WHERE occupancy_status IN ("occupied_owner", "occupied_tenant")'
      );

      if (occupiedFlats.length === 0) {
        return res.status(400).json({ message: 'No occupied flats found to bill.' });
      }

      // Generate bills for each
      for (const flat of occupiedFlats) {
        await dbRun(
          'INSERT INTO maintenance_bills (flat_id, title, amount, due_date, status) VALUES (?, ?, ?, ?, ?)',
          [flat.id, title, amount, due_date, 'unpaid']
        );
      }

      res.status(201).json({
        message: `Successfully generated ${occupiedFlats.length} bills in bulk.`,
        count: occupiedFlats.length
      });
    } else {
      // Single flat bill
      if (!flat_id) {
        return res.status(400).json({ message: 'Flat ID is required for single billing.' });
      }

      const flat = await dbGet('SELECT id FROM flats WHERE id = ?', [flat_id]);
      if (!flat) {
        return res.status(404).json({ message: 'Flat not found.' });
      }

      const result = await dbRun(
        'INSERT INTO maintenance_bills (flat_id, title, amount, due_date, status) VALUES (?, ?, ?, ?, ?)',
        [flat_id, title, amount, due_date, 'unpaid']
      );

      res.status(201).json({
        message: 'Maintenance bill generated successfully.',
        billId: result.id
      });
    }
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ message: 'Error generating maintenance bills.' });
  }
});

// Pay a bill (Resident only - updates status to 'pending' or 'paid' simulating gateway)
router.put('/:id/pay', authenticateToken, requireRole(['resident']), async (req, res) => {
  const { payment_method, transaction_id } = req.body;
  const billId = req.params.id;

  if (!payment_method) {
    return res.status(400).json({ message: 'Payment method is required.' });
  }

  try {
    // Verify bill ownership
    const bill = await dbGet(
      `SELECT mb.*, f.owner_id, f.tenant_id 
       FROM maintenance_bills mb
       JOIN flats f ON mb.flat_id = f.id
       WHERE mb.id = ?`,
      [billId]
    );

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found.' });
    }

    if (bill.owner_id !== req.user.id && bill.tenant_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You cannot pay bills for other flats.' });
    }

    if (bill.status === 'paid') {
      return res.status(400).json({ message: 'This bill is already paid.' });
    }

    const txId = transaction_id || 'MOCK-TXN-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    // In a real app we'd verify gateway. Here we update to 'pending' if UPI/Card, or 'paid' immediately
    // Let's set to 'pending' so admin can approve, showing a verification flow!
    const newStatus = 'pending';
    const payDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await dbRun(
      `UPDATE maintenance_bills 
       SET status = ?, payment_date = ?, payment_method = ?, transaction_id = ? 
       WHERE id = ?`,
      [newStatus, payDate, payment_method, txId, billId]
    );

    res.json({
      message: 'Payment details submitted successfully. Awaiting Admin approval.',
      status: newStatus,
      transactionId: txId
    });
  } catch (error) {
    console.error('Pay bill error:', error);
    res.status(500).json({ message: 'Error processing payment details.' });
  }
});

// Approve Pending Payment / Record direct cash payment (Admin only)
router.put('/:id/approve', authenticateToken, requireRole(['admin']), async (req, res) => {
  const billId = req.params.id;
  const { payment_method, transaction_id } = req.body; // For recording offline cash/cheque direct payments

  try {
    const bill = await dbGet('SELECT * FROM maintenance_bills WHERE id = ?', [billId]);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found.' });
    }

    const payDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const method = payment_method || bill.payment_method || 'Admin Approved';
    const txId = transaction_id || bill.transaction_id || 'OFFLINE-' + Date.now();

    await dbRun(
      `UPDATE maintenance_bills 
       SET status = "paid", payment_date = ?, payment_method = ?, transaction_id = ? 
       WHERE id = ?`,
      [payDate, method, txId, billId]
    );

    res.json({ message: 'Payment approved and recorded successfully.' });
  } catch (error) {
    console.error('Approve bill error:', error);
    res.status(500).json({ message: 'Error approving payment.' });
  }
});

export default router;
