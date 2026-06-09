import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get active notices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const notices = await dbAll(
      `SELECT n.*, u.name AS author_name 
       FROM notices n
       LEFT JOIN users u ON n.created_by = u.id
       WHERE n.expires_at IS NULL OR n.expires_at >= ?
       ORDER BY n.created_at DESC`,
      [today]
    );
    res.json(notices);
  } catch (error) {
    console.error('Fetch notices error:', error);
    res.status(500).json({ message: 'Error retrieving notice board.' });
  }
});

// Add a notice (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { title, content, category, expires_at } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required.' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO notices (title, content, category, created_by, expires_at) VALUES (?, ?, ?, ?, ?)',
      [title, content, category || 'general', req.user.id, expires_at || null]
    );

    res.status(201).json({
      message: 'Notice posted successfully.',
      noticeId: result.id
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ message: 'Error posting notice.' });
  }
});

// Delete a notice (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const noticeId = req.params.id;

  try {
    const notice = await dbGet('SELECT * FROM notices WHERE id = ?', [noticeId]);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found.' });
    }

    await dbRun('DELETE FROM notices WHERE id = ?', [noticeId]);
    res.json({ message: 'Notice deleted successfully.' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ message: 'Error deleting notice.' });
  }
});

export default router;
