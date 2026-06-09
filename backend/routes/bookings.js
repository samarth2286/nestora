import express from 'express';
import { dbAll, dbGet, dbRun } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all bookings
router.get('/', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT fb.*, u.name AS user_name, f.wing, f.flat_number
      FROM facility_bookings fb
      JOIN users u ON fb.user_id = u.id
      LEFT JOIN residents r ON u.id = r.user_id
      LEFT JOIN flats f ON r.flat_id = f.id
    `;
    const params = [];

    // Residents see all active bookings for availability planning, but can see their own filterable.
    // We will return all bookings of status='approved' so they can render schedules on the frontend,
    // but also allow filtering for "my bookings"
    const { my_bookings } = req.query;
    if (my_bookings && my_bookings === 'true') {
      sql += ' WHERE fb.user_id = ?';
      params.push(req.user.id);
    }

    sql += ' ORDER BY fb.booking_date DESC, fb.start_time ASC';

    const bookings = await dbAll(sql, params);
    res.json(bookings);
  } catch (error) {
    console.error('Fetch bookings error:', error);
    res.status(500).json({ message: 'Error retrieving facility bookings.' });
  }
});

// Create a booking with overlap detection
router.post('/', authenticateToken, async (req, res) => {
  const { facility_name, booking_date, start_time, end_time } = req.body;

  if (!facility_name || !booking_date || !start_time || !end_time) {
    return res.status(400).json({ message: 'Facility name, booking date, start time, and end time are required.' });
  }

  if (!['clubhouse', 'gym', 'swimming_pool', 'tennis_court'].includes(facility_name)) {
    return res.status(400).json({ message: 'Invalid facility selection.' });
  }

  // Basic format validation
  if (start_time >= end_time) {
    return res.status(400).json({ message: 'End time must be after start time.' });
  }

  try {
    // Overlap validation: check if there is an approved booking that overlaps
    // Overlap math: existing.start < new.end AND existing.end > new.start
    const clash = await dbGet(
      `SELECT COUNT(*) AS count FROM facility_bookings 
       WHERE facility_name = ? 
         AND booking_date = ? 
         AND status = 'approved'
         AND start_time < ? 
         AND end_time > ?`,
      [facility_name, booking_date, end_time, start_time]
    );

    if (clash.count > 0) {
      return res.status(409).json({ 
        message: `Booking collision! The ${facility_name.replace('_', ' ')} is already booked during this time slot.` 
      });
    }

    const result = await dbRun(
      `INSERT INTO facility_bookings (facility_name, user_id, booking_date, start_time, end_time, status) 
       VALUES (?, ?, ?, ?, ?, 'approved')`,
      [facility_name, req.user.id, booking_date, start_time, end_time]
    );

    res.status(201).json({
      message: 'Booking confirmed successfully!',
      bookingId: result.id
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Error creating facility booking.' });
  }
});

// Cancel a booking
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  const bookingId = req.params.id;

  try {
    const booking = await dbGet('SELECT * FROM facility_bookings WHERE id = ?', [bookingId]);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    // Auth check: Resident can cancel their own; admin can cancel any
    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to cancel this booking.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled.' });
    }

    await dbRun(
      'UPDATE facility_bookings SET status = "cancelled" WHERE id = ?',
      [bookingId]
    );

    res.json({ message: 'Booking cancelled successfully.' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Error cancelling booking.' });
  }
});

export default router;
