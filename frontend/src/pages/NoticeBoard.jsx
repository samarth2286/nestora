import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FileText, Plus, Trash2, Search } from 'lucide-react';

const NoticeBoard = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'general', 'maintenance', 'event', 'warning'

  // Composer Modal (Admin only)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [expiresAt, setExpiresAt] = useState('');
  const [modalMsg, setModalMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const data = await api.get('/notices');
      setNotices(data);
    } catch (e) {
      console.error('Error fetching notices:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePostNoticeSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      setModalMsg({ type: 'danger', text: 'Please fill in required fields.' });
      return;
    }

    try {
      await api.post('/notices', {
        title,
        content,
        category,
        expires_at: expiresAt || null
      });

      setModalMsg({ type: 'success', text: 'Notice posted successfully to board!' });
      setTimeout(() => {
        setIsModalOpen(false);
        setTitle('');
        setContent('');
        setCategory('general');
        setExpiresAt('');
        setModalMsg({ type: '', text: '' });
        fetchNotices();
      }, 1500);
    } catch (error) {
      setModalMsg({ type: 'danger', text: error.message || 'Error posting notice.' });
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (window.confirm('Are you sure you want to remove this notice?')) {
      try {
        await api.delete(`/notices/${noticeId}`);
        fetchNotices();
      } catch (error) {
        alert(error.message || 'Error removing notice.');
      }
    }
  };

  const filteredNotices = notices.filter(notice => {
    const matchCategory = activeCategory === 'all' || notice.category === activeCategory;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      notice.title.toLowerCase().includes(term) ||
      notice.content.toLowerCase().includes(term) ||
      (notice.author_name && notice.author_name.toLowerCase().includes(term));
    return matchCategory && matchSearch;
  });

  return (
    <div className="page-body animate-fade-in">
      <div className="action-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search notices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '4px', border: '1px solid var(--card-border)' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'general', label: 'General' },
              { id: 'maintenance', label: 'Maintenance' },
              { id: 'event', label: 'Events' },
              { id: 'warning', label: 'Warnings' }
            ].map(cat => (
              <button
                key={cat.id}
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  background: activeCategory === cat.id ? 'var(--primary)' : 'transparent',
                  borderColor: 'transparent',
                  color: activeCategory === cat.id ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {user.role === 'admin' && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
              New Notice
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading notices...</div>
      ) : filteredNotices.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No active notices found on the pinboard.</p>
        </div>
      ) : (
        <div className="notice-pinboard animate-fade-in">
          {filteredNotices.map((notice) => (
            <div key={notice.id} className={`glass-panel notice-card notice-${notice.category}`}>
              <div>
                <div className="notice-header">
                  <h4 className="notice-title">{notice.title}</h4>
                  <span className={`badge badge-${
                    notice.category === 'maintenance' ? 'warning' : notice.category === 'warning' ? 'danger' : notice.category === 'event' ? 'success' : 'info'
                  }`}>
                    {notice.category}
                  </span>
                </div>
                <p className="notice-body">{notice.content}</p>
              </div>

              <div className="notice-footer">
                <div>
                  Posted by <span className="notice-author">{notice.author_name || 'Admin'}</span>
                  <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                    Date: {new Date(notice.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {notice.expires_at && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Expires: {new Date(notice.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {user.role === 'admin' && (
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleDeleteNotice(notice.id)}
                      style={{ padding: '6px', color: '#f87171', borderColor: 'rgba(239,68,68,0.1)', background: 'transparent' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Notice Modal (Admin Only) */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container glass-panel animate-fade-in">
            <div className="modal-header">
              <h3 className="modal-title">Compose New Notice</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            {modalMsg.text && (
              <div className={`auth-error-alert badge-${modalMsg.type}`} style={{ background: `var(--${modalMsg.type}-glow)`, color: `var(--${modalMsg.type})`, border: `1px solid rgba(255,255,255,0.08)` }}>
                <span>{modalMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePostNoticeSubmit}>
              <div className="form-group">
                <label className="form-label">Notice Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Lift under maintenance, Parking guidelines"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notice Content *</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '140px', resize: 'vertical' }}
                  placeholder="Write notice announcements details here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Notice Category *</label>
                  <select
                    className="form-input form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="general">General announcement</option>
                    <option value="maintenance">Maintenance alert</option>
                    <option value="event">Society Event</option>
                    <option value="warning">Important Safety Warning</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish to Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;
