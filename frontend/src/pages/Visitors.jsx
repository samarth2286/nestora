import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserCheck, Search, Plus, Calendar, Clock } from 'lucide-react';

const Visitors = () => {
  const { user, profile } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'inside', 'pre_approved', 'history'

  // Resident Pre-approve Modal
  const [isPreModalOpen, setIsPreModalOpen] = useState(false);
  const [preName, setPreName] = useState('');
  const [prePhone, setPrePhone] = useState('');
  const [prePurpose, setPrePurpose] = useState('');
  const [preVehicle, setPreVehicle] = useState('');
  const [preMsg, setPreMsg] = useState({ type: '', text: '' });

  // Guard Log Entry Modal (For pages, though dashboard already has check-in)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryName, setEntryName] = useState('');
  const [entryPhone, setEntryPhone] = useState('');
  const [entryFlatId, setEntryFlatId] = useState('');
  const [entryPurpose, setEntryPurpose] = useState('');
  const [entryVehicle, setEntryVehicle] = useState('');
  const [entryMsg, setEntryMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchVisitors();
    if (user.role === 'staff' || user.role === 'admin') {
      fetchFlats();
    }
  }, [user]);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const data = await api.get('/visitors');
      setVisitors(data);
    } catch (e) {
      console.error('Error fetching visitors log:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlats = async () => {
    try {
      const data = await api.get('/flats');
      setFlats(data.filter(f => f.occupancy_status !== 'vacant'));
    } catch (e) {
      console.error('Error fetching occupied flats list:', e);
    }
  };

  const handleCheckout = async (visitorId) => {
    try {
      await api.put(`/visitors/${visitorId}/checkout`);
      fetchVisitors();
    } catch (error) {
      alert(error.message || 'Error checking out visitor.');
    }
  };

  const handleApproveEntry = async (visitorId) => {
    try {
      await api.put(`/visitors/${visitorId}/approve-entry`);
      fetchVisitors();
    } catch (error) {
      alert(error.message || 'Error checking in visitor.');
    }
  };

  const handlePreApproveSubmit = async (e) => {
    e.preventDefault();
    if (!preName || !prePhone || !prePurpose || !profile.flat_id) {
      setPreMsg({ type: 'danger', text: 'Please fill in required fields.' });
      return;
    }

    try {
      await api.post('/visitors/pre-approve', {
        name: preName,
        phone: prePhone,
        purpose: prePurpose,
        flat_id: profile.flat_id,
        vehicle_number: preVehicle
      });

      setPreMsg({ type: 'success', text: 'Visitor pre-approved successfully! Guard will see this on arrival.' });
      setTimeout(() => {
        setIsPreModalOpen(false);
        setPreName('');
        setPrePhone('');
        setPrePurpose('');
        setPreVehicle('');
        setPreMsg({ type: '', text: '' });
        fetchVisitors();
      }, 1500);
    } catch (error) {
      setPreMsg({ type: 'danger', text: error.message || 'Error logging pre-approval.' });
    }
  };

  const handleEntrySubmit = async (e) => {
    e.preventDefault();
    if (!entryName || !entryPhone || !entryFlatId || !entryPurpose) {
      setEntryMsg({ type: 'danger', text: 'Please fill in required fields.' });
      return;
    }

    try {
      await api.post('/visitors', {
        name: entryName,
        phone: entryPhone,
        flat_id: parseInt(entryFlatId),
        purpose: entryPurpose,
        vehicle_number: entryVehicle
      });

      setEntryMsg({ type: 'success', text: 'Visitor check-in logged successfully!' });
      setTimeout(() => {
        setIsEntryModalOpen(false);
        setEntryName('');
        setEntryPhone('');
        setEntryFlatId('');
        setEntryPurpose('');
        setEntryVehicle('');
        setEntryMsg({ type: '', text: '' });
        fetchVisitors();
      }, 1500);
    } catch (error) {
      setEntryMsg({ type: 'danger', text: error.message || 'Error logging check-in.' });
    }
  };

  const filteredVisitors = visitors.filter(visitor => {
    // Tab filtering
    let matchTab = true;
    if (activeFilter === 'inside') {
      matchTab = visitor.status === 'inside';
    } else if (activeFilter === 'pre_approved') {
      matchTab = visitor.status === 'pre_approved';
    } else if (activeFilter === 'history') {
      matchTab = visitor.status === 'exited';
    }

    // Search term filtering
    const term = searchTerm.toLowerCase();
    const matchSearch =
      visitor.name.toLowerCase().includes(term) ||
      visitor.phone.includes(term) ||
      visitor.purpose.toLowerCase().includes(term) ||
      visitor.wing.toLowerCase().includes(term) ||
      visitor.flat_number.includes(term) ||
      (visitor.owner_name && visitor.owner_name.toLowerCase().includes(term)) ||
      (visitor.tenant_name && visitor.tenant_name.toLowerCase().includes(term));

    return matchTab && matchSearch;
  });

  return (
    <div className="page-body animate-fade-in">
      <div className="action-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search visitors, phone, flat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '4px', border: '1px solid var(--card-border)' }}>
            {[
              { id: 'all', label: 'All Logs' },
              { id: 'inside', label: 'Inside' },
              { id: 'pre_approved', label: 'Pre-Approved' },
              { id: 'history', label: 'Exited History' }
            ].map(tab => (
              <button
                key={tab.id}
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveFilter(tab.id)}
                style={{
                  background: activeFilter === tab.id ? 'var(--primary)' : 'transparent',
                  borderColor: 'transparent',
                  color: activeFilter === tab.id ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {user.role === 'resident' && (
            <button className="btn btn-primary" onClick={() => setIsPreModalOpen(true)}>
              <Plus size={18} />
              Pre-Approve Guest
            </button>
          )}

          {(user.role === 'staff' || user.role === 'admin') && (
            <button className="btn btn-primary" onClick={() => setIsEntryModalOpen(true)}>
              <Plus size={18} />
              Log Visitor
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading visitor registry...</div>
      ) : filteredVisitors.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <UserCheck size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No visitor logs found matching search criteria.</p>
        </div>
      ) : (
        <div className="glass-panel table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Visitor details</th>
                <th>Destination</th>
                <th>Purpose / Vehicle</th>
                <th>Check-In (Entry)</th>
                <th>Check-Out (Exit)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisitors.map(vis => (
                <tr key={vis.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{vis.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{vis.phone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>Flat {vis.wing}-{vis.flat_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Host: {vis.tenant_name || vis.owner_name}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{vis.purpose}</div>
                    <code style={{ fontSize: '0.75rem' }}>{vis.vehicle_number || 'No Vehicle'}</code>
                  </td>
                  <td>
                    {vis.entry_time ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <Clock size={12} className="text-secondary" />
                        <span>{new Date(vis.entry_time).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                    )}
                  </td>
                  <td>
                    {vis.exit_time ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <Clock size={12} className="text-secondary" />
                        <span>{new Date(vis.exit_time).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${
                      vis.status === 'inside' ? 'info' : vis.status === 'pre_approved' ? 'warning' : 'success'
                    }`}>
                      {vis.status === 'inside' ? 'Inside' : vis.status === 'pre_approved' ? 'Pre-Approved' : 'Exited'}
                    </span>
                  </td>
                  <td>
                    {vis.status === 'inside' && (user.role === 'staff' || user.role === 'admin') && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleCheckout(vis.id)}>
                        Check Out
                      </button>
                    )}
                    {vis.status === 'pre_approved' && (user.role === 'staff' || user.role === 'admin') && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleApproveEntry(vis.id)}>
                        Log Entry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resident: Pre-approve Guest Modal */}
      {isPreModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Pre-Approve Visitor</h3>
              <button className="modal-close-btn" onClick={() => setIsPreModalOpen(false)}>✕</button>
            </div>

            {preMsg.text && (
              <div className={`auth-error-alert badge-${preMsg.type}`} style={{ background: `var(--${preMsg.type}-glow)`, color: `var(--${preMsg.type})`, border: `1px solid rgba(255,255,255,0.08)` }}>
                <span>{preMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePreApproveSubmit}>
              <div className="form-group">
                <label className="form-label">Guest Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter guest name"
                  value={preName}
                  onChange={(e) => setPreName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Guest Phone Number *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="10-digit number"
                  value={prePhone}
                  onChange={(e) => setPrePhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Purpose of Visit *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Guest (Dinner), Delivery"
                  value={prePurpose}
                  onChange={(e) => setPrePurpose(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Reg. Number (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. MH-12-CD-5678"
                  value={preVehicle}
                  onChange={(e) => setPreVehicle(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPreModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guard: Log Visitor Entry Modal */}
      {isEntryModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Record Visitor Check-In</h3>
              <button className="modal-close-btn" onClick={() => setIsEntryModalOpen(false)}>✕</button>
            </div>

            {entryMsg.text && (
              <div className={`auth-error-alert badge-${entryMsg.type}`} style={{ background: `var(--${entryMsg.type}-glow)`, color: `var(--${entryMsg.type})`, border: `1px solid rgba(255,255,255,0.08)` }}>
                <span>{entryMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleEntrySubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Visitor Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Visitor name"
                    value={entryName}
                    onChange={(e) => setEntryName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Visitor Phone *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="10 digit number"
                    value={entryPhone}
                    onChange={(e) => setEntryPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Destination Flat *</label>
                  <select
                    className="form-input form-select"
                    value={entryFlatId}
                    onChange={(e) => setEntryFlatId(e.target.value)}
                    required
                  >
                    <option value="">Select flat</option>
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
                    placeholder="e.g. Delivery, Guest"
                    value={entryPurpose}
                    onChange={(e) => setEntryPurpose(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">Vehicle Number (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. MH-02-XY-1234"
                  value={entryVehicle}
                  onChange={(e) => setEntryVehicle(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEntryModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Log check-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Visitors;
