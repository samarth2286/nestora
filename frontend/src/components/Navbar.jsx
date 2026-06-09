import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Calendar, Shield } from 'lucide-react';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return user.role === 'staff' ? 'Gate Portal' : 'Dashboard';
      case '/flats':
        return 'Flat Registry';
      case '/residents':
        return 'Resident Directory';
      case '/maintenance':
        return user.role === 'admin' ? 'Maintenance Billing' : 'My Accounts';
      case '/complaints':
        return 'Helpdesk & Complaints';
      case '/visitors':
        return 'Visitor Log';
      case '/notices':
        return 'Notice Board';
      case '/staff':
        return 'Staff Roster';
      default:
        return 'ResiCentral';
    }
  };

  const formattedDate = time.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = time.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <h1 className="navbar-page-title">{getPageTitle()}</h1>
      </div>

      <div className="navbar-right">
        <div className="navbar-datetime">
          <Calendar size={16} className="text-secondary" />
          <span>{formattedDate}</span>
          <span className="navbar-time-divider">|</span>
          <span className="navbar-time">{formattedTime}</span>
        </div>

        <div className="navbar-badge-container">
          <span className={`badge badge-${
            user.role === 'admin' ? 'danger' : user.role === 'staff' ? 'warning' : 'success'
          } navbar-role-badge`}>
            <Shield size={12} style={{ marginRight: '4px' }} />
            {user.role}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
