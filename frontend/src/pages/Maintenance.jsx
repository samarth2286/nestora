import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CreditCard, Plus, Check, Search, DollarSign } from 'lucide-react';

const Maintenance = () => {
  const { user, profile } = useAuth();
  const [bills, setBills] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unpaid', 'pending', 'paid'
  const [searchTerm, setSearchTerm] = useState('');

  // Admin: Billing Modal
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [billScope, setBillScope] = useState('bulk_occupied'); // 'single', 'bulk_occupied'
  const [billFlatId, setBillFlatId] = useState('');
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState('');
  const [billModalMsg, setBillModalMsg] = useState({ type: '', text: '' });

  // Resident: Checkout Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionId, setTransactionId] = useState('');
  const [payModalMsg, setPayModalMsg] = useState({ type: '', text: '' });

  // Summary Metrics
  const [summary, setSummary] = useState({ paid: 0, pending: 0, unpaid: 0 });

  useEffect(() => {
    fetchBills();
    if (user.role === 'admin') {
      fetchFlats();
    }
  }, [user]);

  const fetchFlats = async () => {
    try {
      const data = await api.get('/flats');
      setFlats(data.filter(f => f.occupancy_status !== 'vacant'));
    } catch (e) {
      console.error('Error fetching flats:', e);
    }
  };

  const fetchBills = async () => {
    setLoading(true);
    try {
      const data = await api.get('/maintenance');
      setBills(data);
      
      // Calculate Summary metrics
      const paid = data.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
      const pending = data.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);
      const unpaid = data.filter(b => b.status === 'unpaid').reduce((sum, b) => sum + b.amount, 0);
      setSummary({ paid, pending, unpaid });
    } catch (error) {
      console.error('Error fetching maintenance bills:', error);
    } finally {
      setLoading(false);
    }
  };

  // Admin: Generate Bill
  const handleGenerateBillSubmit = async (e) => {
    e.preventDefault();
    if (!billTitle || !billAmount || !billDueDate) {
      setBillModalMsg({ type: 'danger', text: 'Please fill in required fields.' });
      return;
    }

    try {
      await api.post('/maintenance', {
        scope: billScope,
        flat_id: billScope === 'single' ? parseInt(billFlatId) : null,
        title: billTitle,
        amount: parseFloat(billAmount),
        due_date: billDueDate
      });

      setBillModalMsg({ type: 'success', text: 'Billing generated successfully!' });
      
      setTimeout(() => {
        setIsBillModalOpen(false);
        setBillTitle('');
        setBillAmount('');
        setBillDueDate('');
        setBillFlatId('');
        setBillModalMsg({ type: '', text: '' });
        fetchBills();
      }, 1500);
    } catch (error) {
      setBillModalMsg({ type: 'danger', text: error.message || 'Error generating billing.' });
    }
  };

  // Resident: Checkout Payment
  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedBill) return;

    try {
      const data = await api.put(`/maintenance/${selectedBill.id}/pay`, {
        payment_method: paymentMethod,
        transaction_id: transactionId
      });

      setPayModalMsg({ 
        type: 'success', 
        text: `Payment logged! Transaction ID: ${data.transactionId}. Awaiting Admin validation.` 
      });

      setTimeout(() => {
        setIsPayModalOpen(false);
        setSelectedBill(null);
        setTransactionId('');
        setPayModalMsg({ type: '', text: '' });
        fetchBills();
      }, 2500);
    } catch (error) {
      setPayModalMsg({ type: 'danger', text: error.message || 'Error submitting payment details.' });
    }
  };

  // Admin: Approve Payment
  const handleApprovePayment = async (billId) => {
    try {
      await api.put(`/maintenance/${billId}/approve`, {});
      fetchBills();
    } catch (error) {
      alert(error.message || 'Error approving payment.');
    }
  };

  // Filter & Search Logic
  const filteredBills = bills.filter(bill => {
    const matchTab = activeTab === 'all' || bill.status === activeTab;
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      bill.title.toLowerCase().includes(term) ||
      bill.wing.toLowerCase().includes(term) ||
      bill.flat_number.includes(term) ||
      (bill.owner_name && bill.owner_name.toLowerCase().includes(term)) ||
      (bill.tenant_name && bill.tenant_name.toLowerCase().includes(term));
    return matchTab && matchSearch;
  });

  return (
    <div className="page-body animate-fade-in">
      
      {/* Summary Metrics */}
      <div className="stat-grid">
        <div className="glass-panel stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--success)' }}>
            <Check size={24} />
          </div>
          <div className="stat-card-info">
            <div className="stat-card-value">₹{summary.paid.toLocaleString('en-IN')}</div>
            <div className="stat-card-label">{user.role === 'admin' ? 'Total Collected' : 'Paid amount'}</div>
          </div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--warning)' }}>
            <CreditCard size={24} />
          </div>
          <div className="stat-card-info">
            <div className="stat-card-value">₹{summary.pending.toLocaleString('en-IN')}</div>
            <div className="stat-card-label">Pending Verification</div>
          </div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--danger)' }}>
            <CreditCard size={24} />
          </div>
          <div className="stat-card-info">
            <div className="stat-card-value">₹{summary.unpaid.toLocaleString('en-IN')}</div>
            <div className="stat-card-label">Total Unpaid Balance</div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="action-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search invoice or resident..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '4px', border: '1px solid var(--card-border)' }}>
            {['all', 'unpaid', 'pending', 'paid'].map(tab => (
              <button
                key={tab}
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab(tab)}
                style={{ 
                  background: activeTab === tab ? 'var(--primary)' : 'transparent',
                  borderColor: 'transparent',
                  color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {user.role === 'admin' && (
            <button className="btn btn-primary" onClick={() => setIsBillModalOpen(true)}>
              <Plus size={18} />
              Generate Bill
            </button>
          )}
        </div>
      </div>

      {/* Bills Table */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading transactions...</div>
      ) : filteredBills.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <CreditCard size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No matching maintenance invoices found.</p>
        </div>
      ) : (
        <div className="glass-panel table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Invoice Title</th>
                <th>Flat / Resident</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Payment Details</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map(bill => (
                <tr key={bill.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{bill.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #{bill.id}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>Flat {bill.wing}-{bill.flat_number}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {bill.tenant_name || bill.owner_name || 'No resident'}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: bill.status === 'paid' ? 'var(--success)' : 'var(--text-primary)' }}>
                    ₹{bill.amount}
                  </td>
                  <td>{new Date(bill.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <span className={`badge badge-${
                      bill.status === 'paid' ? 'success' : bill.status === 'pending' ? 'warning' : 'danger'
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                  <td>
                    {bill.status !== 'unpaid' ? (
                      <div style={{ fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: 500 }}>{bill.payment_method}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Ref: {bill.transaction_id}</div>
                        {bill.payment_date && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            {new Date(bill.payment_date).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    {user.role === 'resident' && bill.status === 'unpaid' && (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setSelectedBill(bill);
                          setIsPayModalOpen(true);
                        }}
                      >
                        Pay Online
                      </button>
                    )}
                    {user.role === 'admin' && bill.status === 'pending' && (
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => handleApprovePayment(bill.id)}
                        style={{ background: 'var(--success)', color: '#fff', border: 'none' }}
                      >
                        Verify & Approve
                      </button>
                    )}
                    {user.role === 'admin' && bill.status === 'unpaid' && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (window.confirm(`Record direct cash payment of ₹${bill.amount} for flat ${bill.wing}-${bill.flat_number}?`)) {
                            handleApprovePayment(bill.id);
                          }
                        }}
                      >
                        Record Cash
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin: Generate Bill Modal */}
      {isBillModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in">
            <div className="modal-header">
              <h3 className="modal-title">Generate Maintenance Invoices</h3>
              <button className="modal-close-btn" onClick={() => setIsBillModalOpen(false)}>✕</button>
            </div>

            {billModalMsg.text && (
              <div className={`auth-error-alert badge-${billModalMsg.type}`} style={{ background: `var(--${billModalMsg.type}-glow)`, color: `var(--${billModalMsg.type})`, border: `1px solid rgba(255,255,255,0.08)` }}>
                <span>{billModalMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleGenerateBillSubmit}>
              <div className="form-group">
                <label className="form-label">Billing Scope *</label>
                <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="billScope" 
                      value="bulk_occupied" 
                      checked={billScope === 'bulk_occupied'}
                      onChange={() => setBillScope('bulk_occupied')}
                    />
                    <span>All Occupied Flats (Bulk)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="billScope" 
                      value="single" 
                      checked={billScope === 'single'}
                      onChange={() => setBillScope('single')}
                    />
                    <span>Single Flat</span>
                  </label>
                </div>
              </div>

              {billScope === 'single' && (
                <div className="form-group animate-fade-in">
                  <label className="form-label">Select Target Flat *</label>
                  <select
                    className="form-input form-select"
                    value={billFlatId}
                    onChange={(e) => setBillFlatId(e.target.value)}
                    required
                  >
                    <option value="">Select flat</option>
                    {flats.map(f => (
                      <option key={f.id} value={f.id}>
                        Flat {f.wing}-{f.flat_number} ({f.tenant_name || f.owner_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Invoice Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Maintenance June 2026"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (INR ₹) *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 3500"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Due Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsBillModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate Invoices
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resident: Payment Checkout Modal */}
      {isPayModalOpen && selectedBill && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Simulated Payment Checkout</h3>
              <button className="modal-close-btn" onClick={() => {
                setIsPayModalOpen(false);
                setSelectedBill(null);
              }}>✕</button>
            </div>

            {payModalMsg.text && (
              <div className={`auth-error-alert badge-${payModalMsg.type}`} style={{ background: `var(--${payModalMsg.type}-glow)`, color: `var(--${payModalMsg.type})`, border: `1px solid rgba(255,255,255,0.08)` }}>
                <span>{payModalMsg.text}</span>
              </div>
            )}

            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Invoice: {selectedBill.title}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                ₹{selectedBill.amount.toLocaleString('en-IN')}
              </div>
            </div>

            <form onSubmit={handlePaySubmit}>
              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select
                  className="form-input form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Reference ID / Notes</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. UPI Ref Number or leave blank for auto-gen"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setIsPayModalOpen(false);
                  setSelectedBill(null);
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Maintenance;
