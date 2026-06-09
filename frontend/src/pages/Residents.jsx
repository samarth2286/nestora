import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, Plus, Search, Trash2 } from 'lucide-react';

const Residents = () => {
  const [residents, setResidents] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Resident Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [flatId, setFlatId] = useState('');
  const [status, setStatus] = useState('owner'); // owner or tenant
  const [emergencyContact, setEmergencyContact] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [modalMsg, setModalMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const residentsData = await api.get('/residents');
      const flatsData = await api.get('/flats');
      setResidents(residentsData);
      setFlats(flatsData);
    } catch (error) {
      console.error('Error fetching residents registry data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddResidentSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !flatId || !status) {
      setModalMsg({ type: 'danger', text: 'Please fill in all required fields.' });
      return;
    }

    try {
      await api.post('/residents', {
        name,
        email,
        phone,
        password,
        flat_id: parseInt(flatId),
        status,
        emergency_contact: emergencyContact,
        move_in_date: moveInDate,
        vehicle_number: vehicleNumber
      });

      setModalMsg({ type: 'success', text: 'Resident registered and linked successfully!' });
      
      setTimeout(() => {
        setIsModalOpen(false);
        // Clear fields
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setFlatId('');
        setStatus('owner');
        setEmergencyContact('');
        setMoveInDate('');
        setVehicleNumber('');
        setModalMsg({ type: '', text: '' });
        fetchData();
      }, 1500);
    } catch (error) {
      setModalMsg({ type: 'danger', text: error.message || 'Error registering resident.' });
    }
  };

  const handleDeleteResident = async (residentId) => {
    if (window.confirm('Are you sure you want to remove this resident? This will also delete their login portal account.')) {
      try {
        await api.delete(`/residents/${residentId}`);
        fetchData();
      } catch (error) {
        alert(error.message || 'Error deleting resident.');
      }
    }
  };

  const filteredResidents = residents.filter(res => {
    const term = searchTerm.toLowerCase();
    return (
      res.name.toLowerCase().includes(term) ||
      res.email.toLowerCase().includes(term) ||
      res.phone.includes(term) ||
      (res.wing && res.wing.toLowerCase().includes(term)) ||
      (res.flat_number && res.flat_number.includes(term))
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
            placeholder="Search by name, email or flat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Register Resident
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading resident roster...</div>
      ) : filteredResidents.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No matching residents found.</p>
        </div>
      ) : (
        <div className="glass-panel table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Resident Info</th>
                <th>Wing & Flat</th>
                <th>Status</th>
                <th>Emergency Contact</th>
                <th>Move-In Date</th>
                <th>Vehicle Number</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredResidents.map((res) => (
                <tr key={res.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{res.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{res.email}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{res.phone || 'No phone'}</div>
                  </td>
                  <td>
                    {res.wing ? (
                      <span style={{ fontWeight: 600 }}>Wing {res.wing} - {res.flat_number}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${
                      res.occupancy_status === 'occupied_owner' ? 'success' : 'info'
                    }`}>
                      {res.occupancy_status === 'occupied_owner' ? 'Owner' : 'Tenant'}
                    </span>
                  </td>
                  <td>{res.emergency_contact || 'N/A'}</td>
                  <td>{res.move_in_date ? new Date(res.move_in_date).toLocaleDateString('en-IN') : 'N/A'}</td>
                  <td>
                    <code style={{ fontSize: '0.85rem' }}>{res.vehicle_number || 'None'}</code>
                  </td>
                  <td>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleDeleteResident(res.id)}
                      style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.1)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register Resident Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Register New Resident</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            {modalMsg.text && (
              <div className={`auth-error-alert badge-${modalMsg.type}`} style={{ background: `var(--${modalMsg.type}-glow)`, color: `var(--${modalMsg.type})`, border: `1px solid rgba(255,255,255,0.08)` }}>
                <span>{modalMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddResidentSubmit}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Account Information
              </h4>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. name@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="10 digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Portal Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Choose password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', color: 'var(--primary)', margin: '20px 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Society Profile Details
              </h4>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Allocate Flat *</label>
                  <select
                    className="form-input form-select"
                    value={flatId}
                    onChange={(e) => setFlatId(e.target.value)}
                    required
                  >
                    <option value="">Select Flat</option>
                    {flats.map(flat => (
                      <option key={flat.id} value={flat.id}>
                        Wing {flat.wing} - {flat.flat_number} ({flat.occupancy_status === 'vacant' ? 'Vacant' : 'Re-allocate'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Resident Relationship *</label>
                  <select
                    className="form-input form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    required
                  >
                    <option value="owner">Owner</option>
                    <option value="tenant">Tenant (Rented)</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Contact number"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Move-In Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={moveInDate}
                    onChange={(e) => setMoveInDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">Vehicle Registration Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. MH-02-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register & Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Residents;
