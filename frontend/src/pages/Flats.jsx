import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Building, Plus, Search, Filter } from 'lucide-react';

const Flats = () => {
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWing, setFilterWing] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Add Flat Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wing, setWing] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [flatType, setFlatType] = useState('2 BHK');
  const [modalMsg, setModalMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchFlats();
  }, [filterWing, filterStatus]);

  const fetchFlats = async () => {
    setLoading(true);
    try {
      let endpoint = '/flats';
      const params = [];
      if (filterWing) params.push(`wing=${filterWing}`);
      if (filterStatus) params.push(`status=${filterStatus}`);
      
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }

      const data = await api.get(endpoint);
      setFlats(data);
    } catch (error) {
      console.error('Fetch flats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFlatSubmit = async (e) => {
    e.preventDefault();
    if (!wing || !flatNumber || !floor || !flatType) {
      setModalMsg({ type: 'danger', text: 'Please fill in all fields.' });
      return;
    }

    try {
      await api.post('/flats', {
        wing,
        flat_number: flatNumber,
        floor: parseInt(floor),
        type: flatType
      });
      
      setModalMsg({ type: 'success', text: 'Flat added successfully!' });
      setTimeout(() => {
        setIsModalOpen(false);
        setWing('');
        setFlatNumber('');
        setFloor('');
        setModalMsg({ type: '', text: '' });
        fetchFlats();
      }, 1500);
    } catch (error) {
      setModalMsg({ type: 'danger', text: error.message || 'Error adding flat.' });
    }
  };

  const filteredFlats = flats.filter(flat => {
    const term = searchTerm.toLowerCase();
    return (
      flat.wing.toLowerCase().includes(term) ||
      flat.flat_number.includes(term) ||
      flat.type.toLowerCase().includes(term) ||
      (flat.owner_name && flat.owner_name.toLowerCase().includes(term)) ||
      (flat.tenant_name && flat.tenant_name.toLowerCase().includes(term))
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
            placeholder="Search by flat, owner or tenant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            className="form-input form-select"
            value={filterWing}
            onChange={(e) => setFilterWing(e.target.value)}
            style={{ width: '130px', paddingRight: '30px' }}
          >
            <option value="">All Wings</option>
            <option value="A">Wing A</option>
            <option value="B">Wing B</option>
            <option value="C">Wing C</option>
          </select>

          <select
            className="form-input form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: '180px', paddingRight: '30px' }}
          >
            <option value="">All Occupancy</option>
            <option value="vacant">Vacant</option>
            <option value="occupied_owner">Occupied (Owner)</option>
            <option value="occupied_tenant">Occupied (Tenant)</option>
          </select>

          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            Add Flat
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading flats registry...</div>
      ) : filteredFlats.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <Building size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No matching flats found in the registry.</p>
        </div>
      ) : (
        <div className="glass-panel table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Wing & Flat</th>
                <th>Floor</th>
                <th>Configuration</th>
                <th>Occupancy Status</th>
                <th>Owner / Primary contact</th>
                <th>Current Tenant</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlats.map((flat) => (
                <tr key={flat.id}>
                  <td style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                    Wing {flat.wing} - {flat.flat_number}
                  </td>
                  <td>Floor {flat.floor}</td>
                  <td>{flat.type}</td>
                  <td>
                    <span className={`badge badge-${
                      flat.occupancy_status === 'vacant' 
                        ? 'warning' 
                        : flat.occupancy_status === 'occupied_owner' 
                          ? 'success' 
                          : 'info'
                    }`}>
                      {flat.occupancy_status === 'vacant' ? 'Vacant' : flat.occupancy_status === 'occupied_owner' ? 'Owner Occupied' : 'Rented (Tenant)'}
                    </span>
                  </td>
                  <td>
                    {flat.owner_name ? (
                      <div>
                        <div style={{ fontWeight: 600 }}>{flat.owner_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{flat.owner_phone}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No Owner linked</span>
                    )}
                  </td>
                  <td>
                    {flat.tenant_name ? (
                      <div>
                        <div style={{ fontWeight: 600 }}>{flat.tenant_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{flat.tenant_phone}</div>
                      </div>
                    ) : (
                      flat.occupancy_status === 'occupied_owner' ? (
                        <span style={{ color: 'var(--text-muted)' }}>Self Occupied</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>N/A</span>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Flat Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in">
            <div className="modal-header">
              <h3 className="modal-title">Add New Flat</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            {modalMsg.text && (
              <div className={`auth-error-alert badge-${modalMsg.type}`} style={{ background: `var(--${modalMsg.type}-glow)`, color: `var(--${modalMsg.type})`, border: `1px solid rgba(255,255,255,0.08)` }}>
                <span>{modalMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddFlatSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Wing *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. A, B, C"
                    maxLength="2"
                    value={wing}
                    onChange={(e) => setWing(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Flat Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 101, 304"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Floor *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 1, 2"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Configuration *</label>
                  <select
                    className="form-input form-select"
                    value={flatType}
                    onChange={(e) => setFlatType(e.target.value)}
                    required
                  >
                    <option value="1 BHK">1 BHK</option>
                    <option value="2 BHK">2 BHK</option>
                    <option value="3 BHK">3 BHK</option>
                    <option value="4 BHK">4 BHK</option>
                    <option value="Penthouse">Penthouse</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Flat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flats;
