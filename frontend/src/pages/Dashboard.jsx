import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Building, 
  Users, 
  CreditCard, 
  AlertCircle, 
  UserPlus, 
  CheckCircle,
  FileText,
  UserCheck,
  ShieldCheck,
  Plus
} from 'lucide-react';

const Dashboard = () => {
  const { user, profile } = useAuth();
  
  // States
  const [stats, setStats] = useState({});
  const [complaints, setComplaints] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [notices, setNotices] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Guard check-in form state
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorFlatId, setVisitorFlatId] = useState('');
  const [visitorPurpose, setVisitorPurpose] = useState('');
  const [visitorVehicle, setVisitorVehicle] = useState('');
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (user.role === 'admin') {
        const flatsData = await api.get('/flats');
        const billsData = await api.get('/maintenance');
        const complaintsData = await api.get('/complaints');
        const visitorsData = await api.get('/visitors');
        
        // Compute statistics
        const totalFlats = flatsData.length;
        const occupied = flatsData.filter(f => f.occupancy_status !== 'vacant').length;
        const occupancyRate = totalFlats > 0 ? Math.round((occupied / totalFlats) * 100) : 0;
        
        const unpaidBills = billsData.filter(b => b.status === 'unpaid').length;
        const pendingBills = billsData.filter(b => b.status === 'pending').length;
        const activeComplaints = complaintsData.filter(c => c.status !== 'resolved').length;
        const visitorsInside = visitorsData.filter(v => v.status === 'inside').length;

        setStats({
          totalFlats,
          occupancyRate,
          unpaidBills,
          pendingBills,
          activeComplaints,
          visitorsInside
        });

        setComplaints(complaintsData.slice(0, 5)); // top 5
        setVisitors(visitorsData.filter(v => v.status === 'inside'));
      }
      
      else if (user.role === 'resident') {
        const billsData = await api.get('/maintenance');
        const complaintsData = await api.get('/complaints');
        const noticesData = await api.get('/notices');
        const visitorsData = await api.get('/visitors');

        const unpaidAmt = billsData
          .filter(b => b.status === 'unpaid')
          .reduce((sum, b) => sum + b.amount, 0);
        
        const activeComplaintsCount = complaintsData.filter(c => c.status !== 'resolved').length;
        const preApprovedCount = visitorsData.filter(v => v.status === 'pre_approved').length;

        setStats({
          unpaidAmt,
          activeComplaintsCount,
          preApprovedCount
        });

        setNotices(noticesData.slice(0, 3));
        setComplaints(complaintsData.slice(0, 5));
      }
      
      else if (user.role === 'staff') {
        const visitorsData = await api.get('/visitors');
        const flatsData = await api.get('/flats');
        const noticesData = await api.get('/notices');

        const insideCount = visitorsData.filter(v => v.status === 'inside').length;
        const preApprovedCount = visitorsData.filter(v => v.status === 'pre_approved').length;
        
        // Count today's exits
        const today = new Date().toISOString().split('T')[0];
        const exitedTodayCount = visitorsData.filter(v => 
          v.status === 'exited' && v.exit_time && v.exit_time.startsWith(today)
        ).length;

        setStats({
          insideCount,
          preApprovedCount,
          exitedTodayCount
        });

        setVisitors(visitorsData.filter(v => v.status === 'inside' || v.status === 'pre_approved'));
        setFlats(flatsData.filter(f => f.occupancy_status !== 'vacant'));
        setNotices(noticesData.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (visitorId) => {
    try {
      await api.put(`/visitors/${visitorId}/checkout`);
      fetchDashboardData();
    } catch (error) {
      alert(error.message || 'Error checking out visitor.');
    }
  };

  const handleApprovePreApproved = async (visitorId) => {
    try {
      await api.put(`/visitors/${visitorId}/approve-entry`);
      fetchDashboardData();
    } catch (error) {
      alert(error.message || 'Error approving visitor entry.');
    }
  };

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!visitorName || !visitorPhone || !visitorFlatId || !visitorPurpose) {
      setFormMsg({ type: 'danger', text: 'Please fill in required fields.' });
      return;
    }

    try {
      await api.post('/visitors', {
        name: visitorName,
        phone: visitorPhone,
        flat_id: parseInt(visitorFlatId),
        purpose: visitorPurpose,
        vehicle_number: visitorVehicle
      });
      
      setFormMsg({ type: 'success', text: 'Visitor logged successfully!' });
      setVisitorName('');
      setVisitorPhone('');
      setVisitorFlatId('');
      setVisitorPurpose('');
      setVisitorVehicle('');
      
      // Refresh list
      fetchDashboardData();
      
      setTimeout(() => setFormMsg({ type: '', text: '' }), 3000);
    } catch (error) {
      setFormMsg({ type: 'danger', text: error.message || 'Error logging visitor.' });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboards dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page-body animate-fade-in">
      
      {/* 1. ADMIN DASHBOARD */}
      {user.role === 'admin' && (
        <>
          <div className="stat-grid">
            <div className="glass-panel stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--info)' }}>
                <Building size={24} />
              </div>
              <div className="stat-card-info">
                <div className="stat-card-value">{stats.totalFlats}</div>
                <div className="stat-card-label">Total Flats</div>
              </div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--success)' }}>
                <Users size={24} />
              </div>
              <div className="stat-card-info">
                <div className="stat-card-value">{stats.occupancyRate}%</div>
                <div className="stat-card-label">Occupancy Rate</div>
              </div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--warning)' }}>
                <CreditCard size={24} />
              </div>
              <div className="stat-card-info">
                <div className="stat-card-value">{stats.pendingBills + stats.unpaidBills}</div>
                <div className="stat-card-label">Pending / Unpaid Bills</div>
              </div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--danger)' }}>
                <AlertCircle size={24} />
              </div>
              <div className="stat-card-info">
                <div className="stat-card-value">{stats.activeComplaints}</div>
                <div className="stat-card-label">Active Complaints</div>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* Visitors Inside */}
            <div className="glass-panel">
              <div className="flex-between" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Active Visitors Inside</h3>
                <span className="badge badge-info">{stats.visitorsInside} Inside</span>
              </div>
              
              {visitors.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No visitors inside currently.</p>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Visitor</th>
                        <th>Flat</th>
                        <th>Purpose</th>
                        <th>Entry Time</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitors.map(visitor => (
                        <tr key={visitor.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{visitor.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{visitor.phone}</div>
                          </td>
                          <td>{visitor.wing}-{visitor.flat_number}</td>
                          <td>{visitor.purpose}</td>
                          <td>{new Date(visitor.entry_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleCheckout(visitor.id)}>
                              Check Out
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Complaints */}
            <div className="glass-panel">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px' }}>Recent Complaints</h3>
              {complaints.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No complaints filed.</p>
              ) : (
                <div className="feed-container">
                  {complaints.map(complaint => (
                    <div className="feed-item" key={complaint.id}>
                      <div className="feed-item-info">
                        <div className="feed-item-title">{complaint.title}</div>
                        <div className="feed-item-subtitle">
                          Flat {complaint.wing}-{complaint.flat_number} • {complaint.category}
                        </div>
                      </div>
                      <span className={`badge badge-${
                        complaint.status === 'open' ? 'danger' : complaint.status === 'in_progress' ? 'warning' : 'success'
                      }`}>
                        {complaint.status === 'in_progress' ? 'progress' : complaint.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 2. RESIDENT DASHBOARD */}
      {user.role === 'resident' && (
        <>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>
              Welcome back, <span className="text-gradient">{user.name}</span>
            </h2>
            {profile && profile.wing && (
              <span className="badge badge-info" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                Flat {profile.wing}-{profile.flat_number} ({profile.status || 'Owner'})
              </span>
            )}
          </div>

          <div className="stat-grid">
            <div className="glass-panel stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--warning)' }}>
                <CreditCard size={24} />
              </div>
              <div className="stat-card-info">
                <div className="stat-card-value">₹{stats.unpaidAmt}</div>
                <div className="stat-card-label">Maintenance Unpaid</div>
              </div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--danger)' }}>
                <AlertCircle size={24} />
              </div>
              <div className="stat-card-info">
                <div className="stat-card-value">{stats.activeComplaintsCount}</div>
                <div className="stat-card-label">My Open Complaints</div>
              </div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--success)' }}>
                <UserCheck size={24} />
              </div>
              <div className="stat-card-info">
                <div className="stat-card-value">{stats.preApprovedCount}</div>
                <div className="stat-card-label">Active Pre-approvals</div>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* Notices */}
            <div className="glass-panel">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px' }}>Notice Board Notices</h3>
              {notices.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No active notices.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {notices.map(notice => (
                    <div key={notice.id} style={{ 
                      padding: '16px', 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      borderLeft: `4px solid var(--${
                        notice.category === 'maintenance' ? 'warning' : notice.category === 'warning' ? 'danger' : 'info'
                      })`,
                      borderRadius: '0 8px 8px 0',
                      borderTop: '1px solid rgba(255,255,255,0.03)',
                      borderRight: '1px solid rgba(255,255,255,0.03)',
                      borderBottom: '1px solid rgba(255,255,255,0.03)'
                    }}>
                      <div className="flex-between" style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{notice.title}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(notice.created_at).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {notice.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Active Complaints Feed */}
            <div className="glass-panel">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px' }}>My Complaints Status</h3>
              {complaints.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No complaints filed.</p>
              ) : (
                <div className="feed-container">
                  {complaints.map(complaint => (
                    <div className="feed-item" key={complaint.id}>
                      <div className="feed-item-info">
                        <div className="feed-item-title">{complaint.title}</div>
                        <div className="feed-item-subtitle">
                          Filed on {new Date(complaint.created_at).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <span className={`badge badge-${
                        complaint.status === 'open' ? 'danger' : complaint.status === 'in_progress' ? 'warning' : 'success'
                      }`}>
                        {complaint.status === 'in_progress' ? 'progress' : complaint.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 3. STAFF / GUARD DASHBOARD */}
      {user.role === 'staff' && (
        <>
          <div className="stat-grid">
            <div className="glass-panel stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--info)' }}>
                <Users size={24} />
              </div>
              <div className="stat-card-info">
                <div className="stat-card-value">{stats.insideCount}</div>
                <div className="stat-card-label">Visitors Inside</div>
              </div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--success)' }}>
                <UserCheck size={24} />
              </div>
              <div className="stat-card-info">
                <div className="stat-card-value">{stats.preApprovedCount}</div>
                <div className="stat-card-label">Pre-approved Invites</div>
              </div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--secondary)' }}>
                <CheckCircle size={24} />
              </div>
              <div className="stat-card-info">
                <div className="stat-card-value">{stats.exitedTodayCount}</div>
                <div className="stat-card-label">Checked Out Today</div>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* Visitor Check-in Form */}
            <div className="glass-panel">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px' }}>Log New Visitor Check-In</h3>
              
              {formMsg.text && (
                <div className={`auth-error-alert badge-${formMsg.type}`} style={{ background: `var(--${formMsg.type}-glow)`, border: `1px solid rgba(255,255,255,0.1)`, color: `var(--${formMsg.type})` }}>
                  <span>{formMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleCheckInSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Visitor Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Enter name"
                      value={visitorName} 
                      onChange={(e) => setVisitorName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="10-digit number"
                      value={visitorPhone} 
                      onChange={(e) => setVisitorPhone(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Target Flat *</label>
                    <select 
                      className="form-input form-select"
                      value={visitorFlatId}
                      onChange={(e) => setVisitorFlatId(e.target.value)}
                      required
                    >
                      <option value="">Select Flat</option>
                      {flats.map(flat => (
                        <option key={flat.id} value={flat.id}>
                          Flat {flat.wing}-{flat.flat_number} ({flat.tenant_name || flat.owner_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purpose of Visit *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Delivery, Guest, Services"
                      value={visitorPurpose} 
                      onChange={(e) => setVisitorPurpose(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle Number (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. MH-02-AB-1234"
                    value={visitorVehicle} 
                    onChange={(e) => setVisitorVehicle(e.target.value)} 
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 24px' }}>
                  <Plus size={18} />
                  Record Entry
                </button>
              </form>
            </div>

            {/* Currently Active Visitors / Pre-approvals */}
            <div className="glass-panel">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px' }}>Active Visitors & Invites</h3>
              
              {visitors.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No active logs.</p>
              ) : (
                <div className="feed-container">
                  {visitors.map(visitor => (
                    <div className="feed-item" key={visitor.id}>
                      <div className="feed-item-info">
                        <div style={{ fontWeight: 600 }}>{visitor.name}</div>
                        <div className="feed-item-subtitle">
                          Flat {visitor.wing}-{visitor.flat_number} • {visitor.purpose}
                        </div>
                      </div>
                      
                      {visitor.status === 'inside' ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleCheckout(visitor.id)}>
                          Check Out
                        </button>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => handleApprovePreApproved(visitor.id)}>
                          Arrived
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default Dashboard;
