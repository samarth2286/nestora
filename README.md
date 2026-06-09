# Nestora - Society Management System

Nestora is a modern, full-stack Society Management System designed to streamline apartment and housing community operations. It includes a unified React frontend (styled with custom Vanilla CSS glassmorphism effects), an Express.js REST API backend, and a local SQLite file database.

## Key Features

1. **Social Hub (Community Feed)**: A private social network for residents to write posts, toggle likes, read comments, and share announcements.
2. **Buy & Sell Marketplace**: A listing directory where society members can sell their old items, filter products by category, search listings, and reveal seller phone numbers.
3. **Amenity Bookings**: A reservation dashboard for common areas (Clubhouse, Gym, Swimming Pool, Tennis Court) with date selectors, active hour timelines, and overlap collision checks.
4. **Flat Management**: Wing records, flat type configurations, and occupancy tracking.
5. **Resident Directory**: Owner & Tenant profiles, contact directories, and vehicle tracking.
6. **Maintenance Tracking**: Bulk billing invoices, online payment simulation, and admin ledger approval.
7. **Complaint Helpdesk**: Categories (plumbing, electrical, cleaning), urgency scales, and staff assignments.
8. **Visitor Gatekeeper**: Security check-ins, visitor logs, checkout timers, and resident invite pre-approvals.
9. **Notice Board**: Color-coded pinned announcements with expiry date triggers.
10. **Staff Roster**: Employee listings, shift schedules, and portal access controls.

---

## Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)

### Setup & Installation
All project dependencies (root, backend, and frontend) can be installed using the root helper script:

1. Clone or open the project folder `c:\society_management` in your terminal.
2. Run the bulk installer:
   ```bash
   npm run install:all
   ```

### Running Locally
To launch both the backend server (port 5000) and the Vite development server (port 5173) concurrently, run:

```bash
npm run dev
```

Open your browser and navigate to **`http://localhost:5173`**.

---

## Demo Credentials

You can sign in with any of these preloaded user roles to explore the application:

| Role | Email Address | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Society Administrator** | `admin@nestora.com` | `admin123` | Control all registry listings, generate bills, verify payments, assign staff, post notices, delete feed posts, and check bookings. |
| **Resident Owner** | `aarav@nestora.com` | `resident123` | Access feed and marketplace, book common facilities, pay maintenance bills, file complaints, and pre-approve guests. |
| **Resident Tenant** | `priya@nestora.com` | `resident123` | Access feed and marketplace, book common facilities, pay maintenance bills, file complaints, and pre-approve guests. |
| **Security Guard (Staff)** | `ramesh@nestora.com` | `staff123` | Log incoming visitors, check out active visitors, check in pre-approved guests, view notice boards, and review facility schedules. |
