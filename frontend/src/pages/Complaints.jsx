import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AlertCircle, Plus, Search, CheckCircle2, User } from 'lucide-react';

const Complaints = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Lodge Modal
  const [isLodgeModalOpen, setIsLodgeModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [urgency, setUrgency] = useState('medium');
  const [lodgeMsg, setLodgeMsg] = useState({ type: '', text: '' });

  // Assign Modal (Admin only)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [assignMsg, setAssignMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchComplaints();
    if (user.role === 'admin') {
      fetchStaff();
    }
  }, [user]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const data = await api.get('/complaints');
      setComplaints(data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const data = await api.get('/staff');
      // filter active plumbers, electricians, cleaners etc.
      setStaffList(data.filter(s => s.status === 'active'));
    } catch (e) {
      console.error('Error fetching staff list:', e);
    }
  };

  const handleLodgeSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !category) {
      setLodgeMsg({ type: 'danger', text: 'Please fill in required fields.' });
      return;
    }

    try {
      await api.post('/complaints', {
        title,
        description,
        category,
        urgency
      });

      setLodgeMsg({ type: 'success', text: 'Complaint lodged successfully! Helpdesk has been notified.' });
      
      setTimeout(() => {
        setIsLodgeModalOpen(false);
        setTitle('');
        setDescription('');
        setCategory('general');
        setUrgency('medium');
        setLodgeMsg({ type: '', text: '' });
        fetchComplaints();
      }, 1500);
    } catch (error) {
      setLodgeMsg({ type: 'danger', text: error.message || 'Error lodging complaint.' });
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    try {
      await api.put(`/complaints/${selectedComplaint.id}/assign`, {
        assigned_staff_id: assignedStaffId ? parseInt(assignedStaffId) : null
      });

      setAssignMsg({ type: 'success', text: 'Complaint assigned successfully!' });

      setTimeout(() => {
        setIsAssignModalOpen(false);
        setSelectedComplaint(null);
        setAssignedStaffId('');
        setAssignMsg({ type: '', text: '' });
        fetchComplaints();
      }, 1500);
    } catch (error) {
      setAssignMsg({ type: 'danger', text: error.message || 'Error assigning staff.' });
    }
  };

  const handleUpdateStatus = async (complaintId, status) => {
    try {
      await api.put(`/complaints/${complaintId}/status`, { status });
      fetchComplaints();
    } catch (error) {
      alert(error.message || 'Error updating status.');
    }
  };

  const filteredComplaints = complaints.filter(comp => {
    const term = searchTerm.toLowerCase();
    return (
      comp.title.toLowerCase().includes(term) ||
      comp.description.toLowerCase().includes(term) ||
      comp.category.toLowerCase().includes(term) ||
      (comp.resident_name && comp.resident_name.toLowerCase().includes(term)) ||
      (comp.wing && comp.wing.toLowerCase().includes(term)) ||
      (comp.flat_number && comp.flat_number.includes(term))
    );
  });

  return (
    <div className="page-body animate-fade-in">
      <div className="action-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search by title, room, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {user.role === 'resident' && (
          <button className="btn btn-primary" onClick={() => setIsLodgeModalOpen(true)}>
            <Plus size={18} />
            Lodge Complaint
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading complaints...</div>
      ) : filteredComplaints.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No matching complaints or tickets found.</p>
        </div>
      ) : (
        <div className="glass-panel table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Complaint Details</th>
                <th>Category / Urgency</th>
                <th>Lodge Date</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map(comp => (
                <tr key={comp.id}>
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{comp.title}</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                      {comp.description}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      By {comp.resident_name} (Flat {comp.wing}-{comp.flat_number}) • Phone: {comp.resident_phone || 'None'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span className="badge badge-info" style={{ alignSelf: 'flex-start' }}>{comp.category}</span>
                      <span className={`badge badge-${
                        comp.urgency === 'high' ? 'danger' : comp.urgency === 'medium' ? 'warning' : 'success'
                      }`} style={{ alignSelf: 'flex-start' }}>
                        {comp.urgency} Priority
                      </span>
                    </div>
                  </td>
                  <td>{new Date(comp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <span className={`badge badge-${
                      comp.status === 'open' ? 'danger' : comp.status === 'in_progress' ? 'warning' : 'success'
                    }`}>
                      {comp.status === 'in_progress' ? 'In Progress' : comp.status}
                    </span>
                  </td>
                  <td>
                    {comp.staff_name ? (
                      <div>
                        <div style={{ fontWeight: 600 }}>{comp.staff_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          Role: {comp.staff_role}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {user.role === 'admin' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedComplaint(comp);
                            setAssignedStaffId(comp.assigned_staff_id || '');
                            setIsAssignModalOpen(true);
                          }}
                        >
                          Assign Help
                        </button>
                      )}
                      
                      {comp.status !== 'resolved' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleUpdateStatus(comp.id, 'resolved')}
                          style={{ background: 'var(--success)', color: '#fff', border: 'none' }}
                        >
                          Resolve
                        </button>
                      )}
                      
                      {comp.status === 'resolved' && comp.status !== 'open' && user.role !== 'staff' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleUpdateStatus(comp.id, 'in_progress')}
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lodge Complaint Modal (Resident) */}
      {isLodgeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in">
            <div className="modal-header">
              <h3 className="modal-title">Lodge Maintenance Request</h3>
              <button className="modal-close-btn" onClick={() => setIsLodgeModalOpen(false)}>✕</button>
            </div>

            {lodgeMsg.text && (
              <div className={`auth-error-alert badge-${lodgeMsg.type}`} style={{ background: `var(--${lodgeMsg.type}-glow)`, color: `var(--${lodgeMsg.type})`, border: `1px solid rgba(255,255,255,0.08)` }}>
                <span>{lodgeMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleLodgeSubmit}>
              <div className="form-group">
                <label className="form-label">Brief Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Corridor bulb fused, Water leakage"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Detailed Description *</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  placeholder="Explain the problem and location..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-input form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="general">General / Helpdesk</option>
                    <option value="plumbing">Plumbing (Water supply)</option>
                    <option value="electrical">Electrical / Power</option>
                    <option value="cleaning">Cleaning / Hygiene</option>
                    <option value="security">Security / Gates</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Urgency Level *</label>
                  <select
                    className="form-input form-select"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    required
                  >
                    <option value="low">Low (Fix at convenience)</option>
                    <option value="medium">Medium (Standard priority)</option>
                    <option value="high">High (Urgent intervention needed)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsLodgeModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Assign Staff Modal */}
      {isAssignModalOpen && selectedComplaint && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Assign Maintenance Staff</h3>
              <button className="modal-close-btn" onClick={() => {
                setIsAssignModalOpen(false);
                setSelectedComplaint(null);
              }}>✕</button>
            </div>

            {assignMsg.text && (
              <div className={`auth-error-alert badge-${assignMsg.type}`} style={{ background: `var(--${assignMsg.type}-glow)`, color: `var(--${assignMsg.type})`, border: `1px solid rgba(255,255,255,0.08)` }}>
                <span>{assignMsg.text}</span>
              </div>
            )}

            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ticket Description</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                {selectedComplaint.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Flat {selectedComplaint.wing}-{selectedComplaint.flat_number} • Category: {selectedComplaint.category}
              </div>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="form-group">
                <label className="form-label">Select Active Personnel *</label>
                <select
                  className="form-input form-select"
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                >
                  <option value="">Leave Unassigned</option>
                  {staffList
                    .filter(s => selectedComplaint.category === 'general' || s.role === selectedComplaint.category || s.role === 'manager' || s.role === 'other')
                    .map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} ({staff.role} - Shift: {staff.shift})
                      </option>
                    ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Showing staff qualified for {selectedComplaint.category} work.
                </span>
              </div>

              <div className="modal-footer" style={{ marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setIsAssignModalOpen(false);
                  setSelectedComplaint(null);
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Complaints;
