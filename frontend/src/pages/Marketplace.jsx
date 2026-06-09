import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShoppingBag, Plus, Search, Tag, Phone, User, Check, Trash } from 'lucide-react';

const Marketplace = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'mine'
  
  // Search & Category
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Contact info reveal state
  const [revealedSellerId, setRevealedSellerId] = useState(null);

  // Add Item Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('electronics');
  const [imageUrl, setImageUrl] = useState('');
  const [modalMsg, setModalMsg] = useState({ type: '', text: '' });

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'furniture', label: 'Furniture' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'books', label: 'Books' },
    { id: 'clothing', label: 'Clothing' },
    { id: 'other', label: 'Others' }
  ];

  useEffect(() => {
    fetchMarketplace();
    fetchMyListings();
  }, [activeCategory]);

  const fetchMarketplace = async () => {
    setLoading(true);
    try {
      let endpoint = '/marketplace';
      if (activeCategory !== 'all') {
        endpoint += `?category=${activeCategory}`;
      }
      const data = await api.get(endpoint);
      setItems(data);
    } catch (e) {
      console.error('Error fetching marketplace:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    try {
      const data = await api.get('/marketplace/my-listings');
      setMyItems(data);
    } catch (e) {
      console.error('Error fetching own listings:', e);
    }
  };

  const handleListItemSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !price || !category) {
      setModalMsg({ type: 'danger', text: 'Please fill in required fields.' });
      return;
    }

    try {
      await api.post('/marketplace', {
        title,
        description,
        price: parseFloat(price),
        category,
        image_url: imageUrl || null
      });

      setModalMsg({ type: 'success', text: 'Listing published successfully!' });
      
      setTimeout(() => {
        setIsModalOpen(false);
        setTitle('');
        setDescription('');
        setPrice('');
        setCategory('electronics');
        setImageUrl('');
        setModalMsg({ type: '', text: '' });
        fetchMarketplace();
        fetchMyListings();
      }, 1500);
    } catch (error) {
      setModalMsg({ type: 'danger', text: error.message || 'Error listing product.' });
    }
  };

  const handleUpdateStatus = async (itemId, newStatus) => {
    try {
      await api.put(`/marketplace/${itemId}/status`, { status: newStatus });
      fetchMarketplace();
      fetchMyListings();
    } catch (error) {
      alert(error.message || 'Error updating listing.');
    }
  };

  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      (item.seller_name && item.seller_name.toLowerCase().includes(term))
    );
  });

  // Category Icon Resolver
  const getCatColor = (cat) => {
    switch(cat) {
      case 'electronics': return '#3b82f6';
      case 'furniture': return '#10b981';
      case 'vehicles': return '#f59e0b';
      case 'books': return '#8b5cf6';
      case 'clothing': return '#ec4899';
      default: return '#64748b';
    }
  };

  return (
    <div className="page-body animate-fade-in">
      
      {/* Tab Switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', gap: '24px' }}>
        <button 
          onClick={() => setActiveTab('browse')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'browse' ? 'var(--primary)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            fontWeight: 600,
            cursor: 'pointer',
            paddingBottom: '8px',
            borderBottom: activeTab === 'browse' ? '2px solid var(--primary)' : 'none',
            transition: 'all var(--transition-fast)'
          }}
        >
          Browse Marketplace
        </button>
        <button 
          onClick={() => setActiveTab('mine')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'mine' ? 'var(--primary)' : 'var(--text-secondary)',
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            fontWeight: 600,
            cursor: 'pointer',
            paddingBottom: '8px',
            borderBottom: activeTab === 'mine' ? '2px solid var(--primary)' : 'none',
            transition: 'all var(--transition-fast)'
          }}
        >
          My Listings
        </button>
      </div>

      {activeTab === 'browse' ? (
        <>
          {/* Action Bar */}
          <div className="action-bar" style={{ marginTop: '10px' }}>
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search products for sale..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
              List Old Product
            </button>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  background: activeCategory === cat.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.03)',
                  borderColor: activeCategory === cat.id ? 'var(--primary)' : 'var(--card-border)',
                  color: activeCategory === cat.id ? '#fff' : 'var(--text-secondary)',
                  borderRadius: '20px',
                  padding: '6px 16px'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading listings...</div>
          ) : filteredItems.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
              <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No active items listed in this category.</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '24px' 
            }}>
              {filteredItems.map(item => (
                <div key={item.id} className="glass-panel glass-panel-interactive animate-fade-in" style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%',
                  justifyContent: 'space-between',
                  padding: '16px'
                }}>
                  <div>
                    {/* Visual Placeholder Image */}
                    <div style={{
                      height: '150px',
                      background: `linear-gradient(135deg, rgba(30, 41, 59, 0.9), ${getCatColor(item.category)}50)`,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      marginBottom: '14px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <Tag size={40} style={{ opacity: 0.25, color: '#fff' }} />
                      <span className="badge" style={{ 
                        position: 'absolute', 
                        top: '12px', 
                        left: '12px',
                        background: getCatColor(item.category),
                        color: '#fff',
                        borderColor: 'transparent'
                      }}>
                        {item.category}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>{item.title}</h4>
                    
                    <p style={{ 
                      fontSize: '0.88rem', 
                      color: 'var(--text-secondary)', 
                      lineHeight: '1.4', 
                      marginBottom: '14px',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      height: '56px'
                    }}>
                      {item.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex-between" style={{ marginBottom: '14px' }}>
                      <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--success)' }}>
                        ₹{item.price.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Seller details */}
                    <div style={{ 
                      padding: '10px', 
                      background: 'rgba(0,0,0,0.15)', 
                      borderRadius: '6px', 
                      fontSize: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <User size={12} />
                        <span>Seller: <strong style={{ color: 'var(--text-primary)' }}>{item.seller_name}</strong></span>
                        {item.wing && <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Flat {item.wing}-{item.flat_number}</span>}
                      </div>

                      {revealedSellerId === item.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem' }} className="animate-fade-in">
                          <Phone size={12} />
                          <span>Call: {item.seller_phone}</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setRevealedSellerId(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Phone size={10} />
                          Reveal Contact Phone
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* My Listings Tab */
        <div style={{ marginTop: '20px' }}>
          {myItems.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
              <Tag size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>You haven't listed any items for sale yet.</p>
            </div>
          ) : (
            <div className="glass-panel table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Date Listed</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myItems.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{item.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.description}</div>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{item.category}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>₹{item.price}</td>
                      <td>{new Date(item.created_at).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span className={`badge badge-${
                          item.status === 'active' ? 'success' : item.status === 'sold' ? 'info' : 'danger'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.status === 'active' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleUpdateStatus(item.id, 'sold')}
                              style={{ color: 'var(--success)', borderColor: 'rgba(16,185,129,0.1)' }}
                            >
                              <Check size={14} style={{ marginRight: '4px' }} />
                              Mark Sold
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleUpdateStatus(item.id, 'removed')}
                              style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.1)' }}
                            >
                              <Trash size={14} style={{ marginRight: '4px' }} />
                              Remove
                            </button>
                          </div>
                        )}
                        {item.status !== 'active' && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Listing Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* List Product Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in">
            <div className="modal-header">
              <h3 className="modal-title">List Item for Sale</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            {modalMsg.text && (
              <div className={`auth-error-alert badge-${modalMsg.type}`} style={{ background: `var(--${modalMsg.type}-glow)`, color: `var(--${modalMsg.type})`, border: `1px solid rgba(255,255,255,0.08)` }}>
                <span>{modalMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleListItemSubmit}>
              <div className="form-group">
                <label className="form-label">Item Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Study Chair, HP Monitor, Cycle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Condition, dimensions, age) *</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Describe the product details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Price (INR ₹) *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 1500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-input form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="electronics">Electronics</option>
                    <option value="furniture">Furniture</option>
                    <option value="vehicles">Vehicles</option>
                    <option value="books">Books</option>
                    <option value="clothing">Clothing</option>
                    <option value="other">Others</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">Product Image URL (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://image-link.com/photo.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  List Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Marketplace;
