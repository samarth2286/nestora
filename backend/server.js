import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';

// Import Routes
import authRouter from './routes/auth.js';
import flatsRouter from './routes/flats.js';
import residentsRouter from './routes/residents.js';
import maintenanceRouter from './routes/maintenance.js';
import complaintsRouter from './routes/complaints.js';
import visitorsRouter from './routes/visitors.js';
import noticesRouter from './routes/notices.js';
import staffRouter from './routes/staff.js';
import postsRouter from './routes/posts.js';
import marketplaceRouter from './routes/marketplace.js';
import bookingsRouter from './routes/bookings.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Bind API endpoints
app.use('/api/auth', authRouter);
app.use('/api/flats', flatsRouter);
app.use('/api/residents', residentsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/visitors', visitorsRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/staff', staffRouter);
app.use('/api/posts', postsRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/bookings', bookingsRouter);

// Health check and root route
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

// Initialize Database and Start Server
const startServer = async () => {
  console.log('Initializing database tables...');
  await initDb();
  
  app.listen(PORT, () => {
    console.log(`Nestora Backend API running on port ${PORT}`);
  });
};

startServer();
