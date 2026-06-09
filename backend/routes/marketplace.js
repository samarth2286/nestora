import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get active marketplace items
router.get('/', authenticateToken, async (req, res) => {
  const { category } = req.query;

  try {
    let sql = `
      SELECT mi.*, u.name AS seller_name, u.phone AS seller_phone, f.wing, f.flat_number
      FROM marketplace_items mi
      JOIN users u ON mi.seller_id = u.id
      LEFT JOIN residents r ON u.id = r.user_id
      LEFT JOIN flats f ON r.flat_id = f.id
      WHERE mi.status = 'active'
    `;
    const params = [];

    if (category) {
      sql += ' AND mi.category = ?';
      params.push(category);
    }

    sql += ' ORDER BY mi.created_at DESC';

    const items = await dbAll(sql, params);
    res.json(items);
  } catch (error) {
    console.error('Fetch marketplace error:', error);
    res.status(500).json({ message: 'Error retrieving marketplace listings.' });
  }
});

// Get user's own listings (both active and sold)
router.get('/my-listings', authenticateToken, async (req, res) => {
  try {
    const items = await dbAll(
      `SELECT * FROM marketplace_items 
       WHERE seller_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(items);
  } catch (error) {
    console.error('Fetch my listings error:', error);
    res.status(500).json({ message: 'Error retrieving your listings.' });
  }
});

// Create listing
router.post('/', authenticateToken, async (req, res) => {
  const { title, description, price, category, image_url } = req.body;

  if (!title || !description || !price || !category) {
    return res.status(400).json({ message: 'Title, description, price, and category are required.' });
  }

  if (!['electronics', 'furniture', 'vehicles', 'books', 'clothing', 'other'].includes(category)) {
    return res.status(400).json({ message: 'Invalid category.' });
  }

  try {
    const result = await dbRun(
      `INSERT INTO marketplace_items (seller_id, title, description, price, category, status, image_url) 
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [req.user.id, title, description, parseFloat(price), category, image_url || null]
    );

    res.status(201).json({
      message: 'Product listed successfully on Nestora Marketplace.',
      itemId: result.id
    });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ message: 'Error listing product.' });
  }
});

// Update status (Mark as sold or remove)
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const itemId = req.params.id;

  if (!status || !['active', 'sold', 'removed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  try {
    const item = await dbGet('SELECT * FROM marketplace_items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    // Check ownership: Only the seller or admin can change status
    if (req.user.role !== 'admin' && item.seller_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied. You can only update your own listings.' });
    }

    await dbRun(
      'UPDATE marketplace_items SET status = ? WHERE id = ?',
      [status, itemId]
    );

    res.json({ message: `Listing marked as ${status} successfully.` });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Error updating listing status.' });
  }
});

// Delete listing (Admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  const itemId = req.params.id;

  try {
    const item = await dbGet('SELECT * FROM marketplace_items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can delete products from the registry.' });
    }

    await dbRun('DELETE FROM marketplace_items WHERE id = ?', [itemId]);
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Error deleting product.' });
  }
});

export default router;
