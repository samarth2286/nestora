import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all posts for the community feed
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Select posts, join author user profile and flat info
    // Also subquery for like count and comment count
    const posts = await dbAll(`
      SELECT p.*, u.name AS author_name, f.wing, f.flat_number,
             (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS likes_count,
             (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) AS comments_count,
             Exists(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) AS user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN residents r ON u.id = r.user_id
      LEFT JOIN flats f ON r.flat_id = f.id
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    // Fetch comments for each post to send in a single layout or let frontend fetch them separately.
    // Fetching comments inline makes the frontend feed load faster and look smoother.
    const postsWithComments = await Promise.all(
      posts.map(async (post) => {
        const comments = await dbAll(`
          SELECT pc.*, u.name AS author_name, f.wing, f.flat_number
          FROM post_comments pc
          JOIN users u ON pc.user_id = u.id
          LEFT JOIN residents r ON u.id = r.user_id
          LEFT JOIN flats f ON r.flat_id = f.id
          WHERE pc.post_id = ?
          ORDER BY pc.created_at ASC
        `, [post.id]);
        return { ...post, comments, user_liked: !!post.user_liked };
      })
    );

    res.json(postsWithComments);
  } catch (error) {
    console.error('Fetch posts error:', error);
    res.status(500).json({ message: 'Error fetching community feed.' });
  }
});

// Create a new feed post
router.post('/', authenticateToken, async (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ message: 'Post content cannot be empty.' });
  }

  try {
    const result = await dbRun(
      'INSERT INTO posts (user_id, content) VALUES (?, ?)',
      [req.user.id, content]
    );
    
    // Fetch the newly created post details to return
    const newPost = await dbGet(`
      SELECT p.*, u.name AS author_name, f.wing, f.flat_number
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN residents r ON u.id = r.user_id
      LEFT JOIN flats f ON r.flat_id = f.id
      WHERE p.id = ?
    `, [result.id]);

    res.status(201).json({
      message: 'Post published to feed.',
      post: { ...newPost, likes_count: 0, comments_count: 0, user_liked: false, comments: [] }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Error publishing post.' });
  }
});

// Toggle Like on a post
router.post('/:id/like', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;

  try {
    const post = await dbGet('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const like = await dbGet('SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    
    if (like) {
      // Unlike
      await dbRun('DELETE FROM post_likes WHERE id = ?', [like.id]);
      res.json({ liked: false, message: 'Post unliked.' });
    } else {
      // Like
      await dbRun('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
      res.json({ liked: true, message: 'Post liked.' });
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ message: 'Error updating like.' });
  }
});

// Add comment to a post
router.post('/:id/comments', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const { comment } = req.body;

  if (!comment) {
    return res.status(400).json({ message: 'Comment content cannot be empty.' });
  }

  try {
    const post = await dbGet('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    const result = await dbRun(
      'INSERT INTO post_comments (post_id, user_id, comment) VALUES (?, ?, ?)',
      [postId, req.user.id, comment]
    );

    const newComment = await dbGet(`
      SELECT pc.*, u.name AS author_name, f.wing, f.flat_number
      FROM post_comments pc
      JOIN users u ON pc.user_id = u.id
      LEFT JOIN residents r ON u.id = r.user_id
      LEFT JOIN flats f ON r.flat_id = f.id
      WHERE pc.id = ?
    `, [result.id]);

    res.status(201).json({
      message: 'Comment added.',
      comment: newComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Error adding comment.' });
  }
});

// Delete a post
router.delete('/:id', authenticateToken, async (req, res) => {
  const postId = req.params.id;

  try {
    const post = await dbGet('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Auth check: Admin or author of the post
    if (req.user.role !== 'admin' && post.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own posts.' });
    }

    await dbRun('DELETE FROM posts WHERE id = ?', [postId]);
    res.json({ message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Error deleting post.' });
  }
});

export default router;
