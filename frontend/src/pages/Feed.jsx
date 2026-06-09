import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MessageSquare, ThumbsUp, Send, Trash2, Calendar } from 'lucide-react';

const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [newCommentText, setNewCommentText] = useState({});
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const data = await api.get('/posts');
      setPosts(data);
    } catch (e) {
      console.error('Error fetching social feed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setPosting(true);
    try {
      const result = await api.post('/posts', { content: newPostContent });
      setPosts([result.post, ...posts]);
      setNewPostContent('');
    } catch (error) {
      alert(error.message || 'Error posting to feed.');
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const result = await api.post(`/posts/${postId}/like`);
      
      // Update local state
      setPosts(posts.map(post => {
        if (post.id === postId) {
          const delta = result.liked ? 1 : -1;
          return { 
            ...post, 
            user_liked: result.liked,
            likes_count: Math.max(0, post.likes_count + delta)
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const commentText = newCommentText[postId];
    if (!commentText || !commentText.trim()) return;

    try {
      const result = await api.post(`/posts/${postId}/comments`, { comment: commentText });
      
      // Update local state
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments_count: post.comments_count + 1,
            comments: [...post.comments, result.comment]
          };
        }
        return post;
      }));

      setNewCommentText({ ...newCommentText, [postId]: '' });
    } catch (error) {
      alert(error.message || 'Error submitting comment.');
    }
  };

  const handleCommentChange = (postId, text) => {
    setNewCommentText({ ...newCommentText, [postId]: text });
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await api.delete(`/posts/${postId}`);
        setPosts(posts.filter(post => post.id !== postId));
      } catch (error) {
        alert(error.message || 'Error deleting post.');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading community feed...</p>
      </div>
    );
  }

  return (
    <div className="page-body animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Create Post Card */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Share an Update</h3>
        <form onSubmit={handleCreatePostSubmit}>
          <div className="form-group">
            <textarea
              className="form-input"
              style={{ minHeight: '80px', resize: 'vertical', background: 'rgba(15,23,42,0.4)' }}
              placeholder={`What's on your mind, ${user.name}? Share announcements, events or chat with neighbors...`}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              maxLength="500"
              required
              disabled={posting}
            />
          </div>
          <div className="flex-between">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {500 - newPostContent.length} characters left
            </span>
            <button type="submit" className="btn btn-primary" disabled={posting || !newPostContent.trim()} style={{ padding: '8px 20px' }}>
              <Send size={16} />
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Feed List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {posts.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
            <MessageSquare size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
              {/* Header */}
              <div className="flex-between" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.95rem'
                  }}>
                    {post.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {post.author_name} 
                      {post.wing && (
                        <span style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--primary)', marginLeft: '8px' }}>
                          Flat {post.wing}-{post.flat_number}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Calendar size={12} />
                      {new Date(post.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>

                {(user.role === 'admin' || post.user_id === user.id) && (
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => handleDeletePost(post.id)}
                    style={{ padding: '6px', color: '#f87171', borderColor: 'transparent', background: 'transparent' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Body */}
              <p style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '18px' }}>
                {post.content}
              </p>

              {/* Actions Row */}
              <div style={{ 
                display: 'flex', 
                gap: '16px', 
                borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
                borderBottom: activeCommentsPostId === post.id ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                padding: '10px 0',
                marginBottom: activeCommentsPostId === post.id ? '16px' : '0'
              }}>
                <button 
                  onClick={() => handleToggleLike(post.id)}
                  style={{ 
                    background: 'transparent',
                    border: 'none',
                    color: post.user_liked ? 'var(--primary)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    transition: 'color var(--transition-fast)'
                  }}
                >
                  <ThumbsUp size={16} style={{ fill: post.user_liked ? 'var(--primary)' : 'none' }} />
                  <span>{post.likes_count} Likes</span>
                </button>

                <button 
                  onClick={() => setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)}
                  style={{ 
                    background: 'transparent',
                    border: 'none',
                    color: activeCommentsPostId === post.id ? 'var(--primary)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  <MessageSquare size={16} />
                  <span>{post.comments_count} Comments</span>
                </button>
              </div>

              {/* Comments Section */}
              {activeCommentsPostId === post.id && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Comments List */}
                  {post.comments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                      {post.comments.map(comment => (
                        <div key={comment.id} style={{ 
                          background: 'rgba(255, 255, 255, 0.02)', 
                          padding: '10px 14px', 
                          borderRadius: '8px', 
                          border: '1px solid rgba(255, 255, 255, 0.04)' 
                        }}>
                          <div className="flex-between" style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                              {comment.author_name}
                              {comment.wing && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '6px' }}>
                                  ({comment.wing}-{comment.flat_number})
                                </span>
                              )}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {new Date(comment.created_at).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            {comment.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment Input */}
                  <form onSubmit={(e) => handleCommentSubmit(e, post.id)} style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem', background: 'rgba(15,23,42,0.6)' }}
                      placeholder="Write a comment..."
                      value={newCommentText[post.id] || ''}
                      onChange={(e) => handleCommentChange(post.id, e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '8px 14px' }}>
                      <Send size={14} />
                    </button>
                  </form>

                </div>
              )}

            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default Feed;
