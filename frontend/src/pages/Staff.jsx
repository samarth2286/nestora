import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShieldCheck, Plus, Trash2, Search, Phone } from 'lucide-react';

const Staff = () => {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Staff Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('security');
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState('general');
  const [status, setStatus] = useState('active');
  
  // Optional Login Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [modalMsg, setModalMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await api.get('/staff');
      setStaffList(data);
    } catch (e) {
      console.error('Error fetching staff roster:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    if (!name || !role || !phone) {
      setModalMsg({ type: 'danger', text: 'Please fill in required fields.' });
      return;
    }

    try {
      await api.post('/staff', {
        name,
        role,
        phone,
        shift,
        status,
        email: email || null,
        password: password || null
      });

      setModalMsg({ type: 'success', text: 'Staff profile created successfully!' });
      setTimeout(() => {
        setIsModalOpen(false);
        setName('');
        setRole('security');
        setPhone('');
        setShift('general');
        setStatus('active');
        setEmail('');
        setPassword('');
        setModalMsg({ type: '', text: '' });
        fetchStaff();
      }, 1500);
    } catch (error) {
      setModalMsg({ type: 'danger', text: error.message || 'Error registering staff.' });
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (window.confirm('Are you sure you want to remove this staff profile? This will also remove any linked system portal login accounts.')) {
      try {
        await api.delete(`/staff/${staffId}`);
        fetchStaff();
      } catch (error) {
        alert(error.message || 'Error deleting staff profile.');
      }
    }
  };

  const filteredStaff = staffList.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.role.toLowerCase().includes(term) ||
      s.phone.includes(term) ||
      (s.email && s.email.toLowerCase().includes(term))
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
            placeholder="Search by name, role or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {user.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            Add Staff Member
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading staff registry...</div>
      ) : filteredStaff.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <ShieldCheck size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No matching staff members found.</p>
        </div>
      ) : (
        <div className="glass-panel table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Role / Category</th>
                <th>Contact Details</th>
                <th>Shift Details</th>
                <th>Status</th>
                {user.role === 'admin' && <th>Portal Access</th>}
                {user.role === 'admin' && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Staff ID: #S{s.id}</div>
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{s.role}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={12} className="text-secondary" />
                      <span style={{ fontWeight: 500 }}>{s.phone}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{s.shift} Shift</span>
                  </td>
                  <td>
                    <span className={`badge badge-${s.status === 'active' ? 'success' : 'warning'}`}>
                      {s.status}
                    </span>
                  </td>
                  {user.role === 'admin' && (
                    <td>
                      {s.email ? (
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{s.email}</div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Linked Portal User</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No Login Access</span>
                      )}
                    </td>
                  )}
                  {user.role === 'admin' && (
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleDeleteStaff(s.id)}
                        style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.1)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Register Staff Member</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            {modalMsg.text && (
              <div className={`auth-error-alert badge-${modalMsg.type}`} style={{ background: `var(--${modalMsg.type}-glow)`, color: `var(--${modalMsg.type})`, border: `1px solid rgba(255,255,255,0.08)` }}>
                <span>{modalMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Profile details
              </h4>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter staff name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Role Category *</label>
                  <select
                    className="form-input form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  >
                    <option value="security">Security Guard</option>
                    <option value="cleaner">Cleaning Staff</option>
                    <option value="plumber">Plumber</option>
                    <option value="electrician">Electrician</option>
                    <option value="manager">Society Manager</option>
                    <option value="other">Other Technician</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duty Shift *</label>
                  <select
                    className="form-input form-select"
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    required
                  >
                    <option value="general">General (9 AM - 6 PM)</option>
                    <option value="day">Day Shift (8 AM - 8 PM)</option>
                    <option value="night">Night Shift (8 PM - 8 AM)</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">Operational Status</label>
                <select
                  className="form-input form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Active / On Duty</option>
                  <option value="inactive">Inactive / On Leave</option>
                </select>
              </div>

              <h4 style={{ fontSize: '0.95rem', color: 'var(--primary)', margin: '20px 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                System Portal Login (Optional)
              </h4>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Login Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. guard1@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Login Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Minimum 6 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
