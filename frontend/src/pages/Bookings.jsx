import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CalendarRange, Plus, Clock, AlertTriangle, Calendar, Check } from 'lucide-react';

const Bookings = () => {
  const { user } = useAuth();
  const [allBookings, setAllBookings] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Schedule View
  const [selectedFacility, setSelectedFacility] = useState('clubhouse');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Booking Form State
  const [formFacility, setFormFacility] = useState('clubhouse');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });

  const facilities = [
    { id: 'clubhouse', label: 'Clubhouse', color: '#8b5cf6' },
    { id: 'gym', label: 'Fitness Gym', color: '#ef4444' },
    { id: 'swimming_pool', label: 'Swimming Pool', color: '#06b6d4' },
    { id: 'tennis_court', label: 'Tennis Court', color: '#10b981' }
  ];

  const timeOptions = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const allData = await api.get('/bookings');
      const myData = await api.get('/bookings?my_bookings=true');
      setAllBookings(allData.filter(b => b.status === 'approved'));
      setMyBookings(myData);
    } catch (e) {
      console.error('Error fetching bookings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBookingSubmit = async (e) => {
    e.preventDefault();
    if (startTime >= endTime) {
      setFormMsg({ type: 'danger', text: 'End Time must be strictly after Start Time.' });
      return;
    }

    try {
      await api.post('/bookings', {
        facility_name: formFacility,
        booking_date: formDate,
        start_time: startTime,
        end_time: endTime
      });

      setFormMsg({ type: 'success', text: 'Booking slot reserved and approved!' });
      
      // Reset forms
      setStartTime('10:00');
      setEndTime('12:00');
      
      // Refresh list
      fetchBookings();

      setTimeout(() => setFormMsg({ type: '', text: '' }), 3000);
    } catch (error) {
      setFormMsg({ type: 'danger', text: error.message || 'Error booking slot.' });
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking slot?')) {
      try {
        await api.put(`/bookings/${bookingId}/cancel`);
        fetchBookings();
      } catch (error) {
        alert(error.message || 'Error cancelling booking.');
      }
    }
  };

  // Filter Bookings for the Schedule Timeline
  const activeDayBookings = allBookings.filter(b => 
    b.facility_name === selectedFacility && 
    b.booking_date === selectedDate
  );

  // Hourly timeline generator (06:00 to 22:00)
  const timelineHours = [];
  for (let i = 6; i < 22; i++) {
    const startStr = `${i < 10 ? '0' : ''}${i}:00`;
    const endStr = `${i+1 < 10 ? '0' : ''}${i+1}:00`;
    
    // Check if this hour is covered by any booking
    const booking = activeDayBookings.find(b => 
      startStr >= b.start_time && startStr < b.end_time
    );

    timelineHours.push({
      start: startStr,
      end: endStr,
      booked: !!booking,
      bookedBy: booking ? `${booking.user_name} (${booking.wing ? `${booking.wing}-${booking.flat_number}` : 'Admin'})` : null
    });
  }

  const getFacilityColor = (facId) => {
    return facilities.find(f => f.id === facId)?.color || 'var(--primary)';
  };

  return (
    <div className="page-body animate-fade-in">
      
      <div className="dashboard-grid">
        
        {/* Left Panel: Booking Scheduler & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Facility Filter & Date Selector */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>Check Amenity Availability</h3>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label className="form-label">Select Amenity</label>
                <select
                  className="form-input form-select"
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '180px' }}>
                <label className="form-label">Select Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Availability Timeline Graph */}
          <div className="glass-panel">
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Hourly Schedule</h3>
              <span className="badge badge-info" style={{ background: `${getFacilityColor(selectedFacility)}20`, color: getFacilityColor(selectedFacility) }}>
                {facilities.find(f => f.id === selectedFacility)?.label}
              </span>
            </div>

            {loading ? (
              <p style={{ color: 'var(--text-secondary)' }}>Loading schedule...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {timelineHours.map(hour => (
                  <div key={hour.start} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px 16px', 
                    background: hour.booked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.06)', 
                    border: `1px solid ${hour.booked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)'}`,
                    borderRadius: '8px',
                    transition: 'all var(--transition-fast)'
                  }}>
                    <div style={{ 
                      width: '100px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      fontWeight: 600,
                      color: hour.booked ? '#f87171' : 'var(--success)',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      <Clock size={14} />
                      <span>{hour.start}</span>
                    </div>

                    <div style={{ flex: 1, fontSize: '0.9rem' }}>
                      {hour.booked ? (
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Booked by <strong style={{ color: 'var(--text-primary)' }}>{hour.bookedBy}</strong>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Slot Available</span>
                      )}
                    </div>

                    <span className={`badge badge-${hour.booked ? 'danger' : 'success'}`} style={{ fontSize: '0.65rem' }}>
                      {hour.booked ? 'Reserved' : 'Free'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Panel: Book Area Form & My Bookings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Reservation Form */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px' }}>Book an Amenity</h3>
            
            {formMsg.text && (
              <div className={`auth-error-alert badge-${formMsg.type}`} style={{ background: `var(--${formMsg.type}-glow)`, color: `var(--${formMsg.type})`, border: `1px solid rgba(255,255,255,0.08)` }}>
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Choose Facility *</label>
                <select
                  className="form-input form-select"
                  value={formFacility}
                  onChange={(e) => setFormFacility(e.target.value)}
                  required
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Booking Date *</label>
                <input
                  type="date"
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Time *</label>
                  <select
                    className="form-input form-select"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  >
                    {timeOptions.slice(0, -1).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">End Time *</label>
                  <select
                    className="form-input form-select"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  >
                    {timeOptions.slice(1).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '8px' }}>
                <Plus size={18} />
                Reserve Time Slot
              </button>
            </form>
          </div>

          {/* My Bookings Log */}
          <div className="glass-panel">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px' }}>My Bookings Ledger</h3>
            
            {myBookings.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No amenity reservations logged.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                {myBookings.map(b => (
                  <div key={b.id} style={{ 
                    padding: '14px', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div className="flex-between">
                      <span style={{ fontWeight: 700, textTransform: 'capitalize', fontSize: '0.95rem' }}>
                        {b.facility_name.replace('_', ' ')}
                      </span>
                      <span className={`badge badge-${b.status === 'approved' ? 'success' : 'danger'}`} style={{ fontSize: '0.65rem' }}>
                        {b.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '14px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        <span>{new Date(b.booking_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{b.start_time} - {b.end_time}</span>
                      </div>
                    </div>

                    {b.status === 'approved' && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleCancelBooking(b.id)}
                        style={{ alignSelf: 'flex-start', color: '#f87171', borderColor: 'rgba(239,68,68,0.1)' }}
                      >
                        Cancel Slot
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default Bookings;
