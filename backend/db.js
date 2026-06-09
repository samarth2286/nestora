import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Helper wrapper to run SQL queries as promises
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize database schema and seed data
export const initDb = async () => {
  try {
    // Enable Foreign Keys
    await dbRun('PRAGMA foreign_keys = ON;');

    // 1. Create Users Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('admin', 'resident', 'staff')) NOT NULL,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create Flats Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS flats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wing TEXT NOT NULL,
        flat_number TEXT NOT NULL,
        floor INTEGER NOT NULL,
        type TEXT NOT NULL,
        occupancy_status TEXT CHECK(occupancy_status IN ('vacant', 'occupied_owner', 'occupied_tenant')) DEFAULT 'vacant',
        owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        tenant_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(wing, flat_number)
      )
    `);

    // 3. Create Residents Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS residents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        flat_id INTEGER REFERENCES flats(id) ON DELETE SET NULL,
        emergency_contact TEXT,
        move_in_date DATE,
        vehicle_number TEXT
      )
    `);

    // 4. Create Staff Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        role TEXT CHECK(role IN ('security', 'cleaner', 'plumber', 'electrician', 'manager', 'other')) NOT NULL,
        phone TEXT NOT NULL,
        shift TEXT CHECK(shift IN ('day', 'night', 'general')) DEFAULT 'general',
        status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active'
      )
    `);

    // 5. Create Maintenance Bills Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS maintenance_bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flat_id INTEGER REFERENCES flats(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        due_date DATE NOT NULL,
        status TEXT CHECK(status IN ('unpaid', 'pending', 'paid')) DEFAULT 'unpaid',
        payment_date DATETIME,
        payment_method TEXT,
        transaction_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Create Complaints Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT CHECK(category IN ('plumbing', 'electrical', 'security', 'cleaning', 'general')) NOT NULL,
        urgency TEXT CHECK(urgency IN ('low', 'medium', 'high')) DEFAULT 'medium',
        status TEXT CHECK(status IN ('open', 'in_progress', 'resolved')) DEFAULT 'open',
        assigned_staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Create Visitors Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        flat_id INTEGER REFERENCES flats(id) ON DELETE CASCADE,
        purpose TEXT NOT NULL,
        vehicle_number TEXT,
        entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        exit_time DATETIME,
        status TEXT CHECK(status IN ('inside', 'exited', 'pre_approved')) DEFAULT 'inside',
        created_by INTEGER REFERENCES users(id)
      )
    `);

    // 8. Create Notices Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT CHECK(category IN ('general', 'maintenance', 'event', 'warning')) DEFAULT 'general',
        created_by INTEGER REFERENCES users(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATE
      )
    `);

    // 9. Create Posts Table (Social Feed)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Create Post Likes Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(post_id, user_id)
      )
    `);

    // 11. Create Post Comments Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. Create Marketplace Items Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS marketplace_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT CHECK(category IN ('electronics', 'furniture', 'vehicles', 'books', 'clothing', 'other')) NOT NULL,
        status TEXT CHECK(status IN ('active', 'sold', 'removed')) DEFAULT 'active',
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 13. Create Facility Bookings Table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS facility_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        facility_name TEXT CHECK(facility_name IN ('clubhouse', 'gym', 'swimming_pool', 'tennis_court')) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        booking_date DATE NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT CHECK(status IN ('approved', 'cancelled')) DEFAULT 'approved',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // --- Seeding ---
    // Check if seeding is already done (by checking if users exist)
    const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      console.log('Seeding initial database tables...');

      // Create admin, residents, staff passwords
      const adminPass = bcrypt.hashSync('admin123', 10);
      const resPass = bcrypt.hashSync('resident123', 10);
      const staffPass = bcrypt.hashSync('staff123', 10);

      // Insert Users
      const adminResult = await dbRun(
        'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
        ['Society Admin', 'admin@nestora.com', adminPass, 'admin', '9876543210']
      );

      const res1Result = await dbRun(
        'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
        ['Aarav Mehta', 'aarav@nestora.com', resPass, 'resident', '9876543211']
      );

      const res2Result = await dbRun(
        'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
        ['Priya Sharma', 'priya@nestora.com', resPass, 'resident', '9876543212']
      );

      const guard1Result = await dbRun(
        'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
        ['Ramesh Kumar', 'ramesh@nestora.com', staffPass, 'staff', '9876543213']
      );

      // Insert Staff profiles
      const staffResult = await dbRun(
        'INSERT INTO staff (user_id, name, role, phone, shift, status) VALUES (?, ?, ?, ?, ?, ?)',
        [guard1Result.id, 'Ramesh Kumar', 'security', '9876543213', 'day', 'active']
      );

      const plumberResult = await dbRun(
        'INSERT INTO staff (name, role, phone, shift, status) VALUES (?, ?, ?, ?, ?)',
        ['Suresh Singh', 'plumber', '9876543214', 'general', 'active']
      );

      // Insert Flats
      // Wing A
      const fA101 = await dbRun('INSERT INTO flats (wing, flat_number, floor, type, occupancy_status, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
        ['A', '101', 1, '2 BHK', 'occupied_owner', res1Result.id]);
      const fA102 = await dbRun('INSERT INTO flats (wing, flat_number, floor, type, occupancy_status) VALUES (?, ?, ?, ?, ?)',
        ['A', '102', 1, '2 BHK', 'vacant']);
      const fA201 = await dbRun('INSERT INTO flats (wing, flat_number, floor, type, occupancy_status) VALUES (?, ?, ?, ?, ?)',
        ['A', '201', 2, '3 BHK', 'vacant']);
      
      // Wing B
      const fB101 = await dbRun('INSERT INTO flats (wing, flat_number, floor, type, occupancy_status, owner_id, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['B', '101', 1, '1 BHK', 'occupied_tenant', adminResult.id, res2Result.id]); // Admin owns, Priya is tenant
      const fB102 = await dbRun('INSERT INTO flats (wing, flat_number, floor, type, occupancy_status) VALUES (?, ?, ?, ?, ?)',
        ['B', '102', 1, '1 BHK', 'vacant']);

      // Insert Resident Profiles
      await dbRun(
        'INSERT INTO residents (user_id, flat_id, emergency_contact, move_in_date, vehicle_number) VALUES (?, ?, ?, ?, ?)',
        [res1Result.id, fA101.id, '9876540001', '2025-01-15', 'MH-02-AB-1234']
      );

      await dbRun(
        'INSERT INTO residents (user_id, flat_id, emergency_contact, move_in_date, vehicle_number) VALUES (?, ?, ?, ?, ?)',
        [res2Result.id, fB101.id, '9876540002', '2025-04-01', 'MH-02-XY-9876']
      );

      // Insert Maintenance Bills
      await dbRun(
        'INSERT INTO maintenance_bills (flat_id, title, amount, due_date, status) VALUES (?, ?, ?, ?, ?)',
        [fA101.id, 'Maintenance June 2026', 3500.0, '2026-06-15', 'unpaid']
      );
      await dbRun(
        'INSERT INTO maintenance_bills (flat_id, title, amount, due_date, status, payment_date, payment_method, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [fA101.id, 'Maintenance May 2026', 3500.0, '2026-05-15', 'paid', '2026-05-10 11:30:00', 'UPI', 'TXN12345678']
      );
      await dbRun(
        'INSERT INTO maintenance_bills (flat_id, title, amount, due_date, status) VALUES (?, ?, ?, ?, ?)',
        [fB101.id, 'Maintenance June 2026', 2500.0, '2026-06-15', 'unpaid']
      );

      // Insert Notices
      await dbRun(
        'INSERT INTO notices (title, content, category, created_by, expires_at) VALUES (?, ?, ?, ?, ?)',
        [
          'Annual General Meeting (AGM)',
          'All residents are requested to attend the AGM on June 14, 2026, at 10:00 AM in the Clubhouse. Discussion points include paint renewal and safety audits.',
          'general',
          adminResult.id,
          '2026-06-15'
        ]
      );
      await dbRun(
        'INSERT INTO notices (title, content, category, created_by, expires_at) VALUES (?, ?, ?, ?, ?)',
        [
          'Water Supply Interruption',
          'There will be a water supply cut on Wednesday, June 10, from 1:00 PM to 5:00 PM due to overhead tank cleaning operations.',
          'maintenance',
          adminResult.id,
          '2026-06-11'
        ]
      );

      // Insert Complaints
      await dbRun(
        'INSERT INTO complaints (resident_id, title, description, category, urgency, status, assigned_staff_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          res1Result.id,
          'Leaking tap in master bathroom',
          'Water is continuously dripping from the sink tap. Please fix it.',
          'plumbing',
          'medium',
          'in_progress',
          plumberResult.id
        ]
      );
      await dbRun(
        'INSERT INTO complaints (resident_id, title, description, category, urgency, status) VALUES (?, ?, ?, ?, ?, ?)',
        [
          res2Result.id,
          'Fluctuating voltage in Wing B',
          'The corridor lights and my flat power supply fluctuate constantly since yesterday evening.',
          'electrical',
          'high',
          'open'
        ]
      );

      // Insert Visitors
      await dbRun(
        'INSERT INTO visitors (name, phone, flat_id, purpose, vehicle_number, entry_time, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          'Amit Verma',
          '9811223344',
          fA101.id,
          'Guest (Friend of Aarav)',
          'MH-02-CD-5678',
          '2026-06-08 19:30:00',
          'inside',
          guard1Result.id
        ]
      );
      await dbRun(
        'INSERT INTO visitors (name, phone, flat_id, purpose, vehicle_number, entry_time, exit_time, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          'Delivery Boy (Amazon)',
          '9811223399',
          fB101.id,
          'Delivery',
          null,
          '2026-06-08 15:00:00',
          '2026-06-08 15:15:00',
          'exited',
          guard1Result.id
        ]
      );

      // --- Seed Social Feed ---
      const post1 = await dbRun(
        'INSERT INTO posts (user_id, content) VALUES (?, ?)',
        [res1Result.id, 'Does anyone want to join for a morning walk tomorrow around 6:30 AM? Meeting at the main gate.']
      );
      const post2 = await dbRun(
        'INSERT INTO posts (user_id, content) VALUES (?, ?)',
        [res2Result.id, 'Found a set of silver house keys near the children play garden area. Please contact me if you are looking for them.']
      );

      // Seed Post Likes
      await dbRun(
        'INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)',
        [post1.id, res2Result.id]
      );

      // Seed Post Comments
      await dbRun(
        'INSERT INTO post_comments (post_id, user_id, comment) VALUES (?, ?, ?)',
        [post1.id, res2Result.id, "I'd love to join! See you in the lobby at 6:30 AM."]
      );

      // --- Seed Marketplace ---
      await dbRun(
        'INSERT INTO marketplace_items (seller_id, title, description, price, category, status) VALUES (?, ?, ?, ?, ?, ?)',
        [
          res1Result.id,
          'Pre-owned Wooden Study Table',
          'Well maintained solid wood study table with 3 drawers. Size: 4x2 ft. Slight scratch on the left side, otherwise in excellent condition.',
          1500.00,
          'furniture',
          'active'
        ]
      );
      await dbRun(
        'INSERT INTO marketplace_items (seller_id, title, description, price, category, status) VALUES (?, ?, ?, ?, ?, ?)',
        [
          res2Result.id,
          'Canon DSLR Camera (EOS 1500D)',
          'Gently used DSLR camera with 18-55mm kit lens. 2 years old, barely used (less than 3000 clicks). Includes battery, charger, bag, and 16GB memory card.',
          12000.00,
          'electronics',
          'active'
        ]
      );

      // --- Seed Facility Bookings ---
      await dbRun(
        'INSERT INTO facility_bookings (facility_name, user_id, booking_date, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
        ['clubhouse', res1Result.id, '2026-06-15', '10:00', '12:00']
      );
      await dbRun(
        'INSERT INTO facility_bookings (facility_name, user_id, booking_date, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
        ['tennis_court', res2Result.id, '2026-06-16', '17:00', '19:00']
      );

      console.log('Database seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

export default db;
