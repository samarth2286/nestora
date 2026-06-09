import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  AlertCircle, 
  UserCheck, 
  FileText, 
  ShieldCheck, 
  LogOut,
  MessageSquare,
  ShoppingBag,
  CalendarDays
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const adminLinks = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/feed', label: 'Social Hub', icon: <MessageSquare size={20} /> },
    { to: '/marketplace', label: 'Marketplace', icon: <ShoppingBag size={20} /> },
    { to: '/bookings', label: 'Amenity Bookings', icon: <CalendarDays size={20} /> },
    { to: '/flats', label: 'Flats', icon: <Building2 size={20} /> },
    { to: '/residents', label: 'Residents', icon: <Users size={20} /> },
    { to: '/maintenance', label: 'Maintenance', icon: <CreditCard size={20} /> },
    { to: '/complaints', label: 'Complaints', icon: <AlertCircle size={20} /> },
    { to: '/visitors', label: 'Visitors Log', icon: <UserCheck size={20} /> },
    { to: '/notices', label: 'Notice Board', icon: <FileText size={20} /> },
    { to: '/staff', label: 'Staff Management', icon: <ShieldCheck size={20} /> },
  ];

  const residentLinks = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/feed', label: 'Social Hub', icon: <MessageSquare size={20} /> },
    { to: '/marketplace', label: 'Marketplace', icon: <ShoppingBag size={20} /> },
    { to: '/bookings', label: 'Amenity Bookings', icon: <CalendarDays size={20} /> },
    { to: '/maintenance', label: 'My Maintenance', icon: <CreditCard size={20} /> },
    { to: '/complaints', label: 'My Complaints', icon: <AlertCircle size={20} /> },
    { to: '/visitors', label: 'Visitor Invites', icon: <UserCheck size={20} /> },
    { to: '/notices', label: 'Notice Board', icon: <FileText size={20} /> },
  ];

  const staffLinks = [
    { to: '/', label: 'Security Gate', icon: <LayoutDashboard size={20} /> },
    { to: '/bookings', label: 'Amenity Bookings', icon: <CalendarDays size={20} /> },
    { to: '/visitors', label: 'Visitor Logs', icon: <UserCheck size={20} /> },
    { to: '/notices', label: 'Notice Board', icon: <FileText size={20} /> },
    { to: '/staff', label: 'Staff Directory', icon: <ShieldCheck size={20} /> },
  ];

  const getLinks = () => {
    switch (user.role) {
      case 'admin':
        return adminLinks;
      case 'resident':
        return residentLinks;
      case 'staff':
        return staffLinks;
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <aside className="sidebar-container">
      <div className="sidebar-brand">
        <span className="brand-dot"></span>
        <span className="brand-text">Nes<span className="text-gradient">tora</span></span>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => 
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            end={link.to === '/'}
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            <span className="sidebar-link-label">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-role">{user.role}</div>
          </div>
        </div>
        <button className="sidebar-logout-btn" onClick={logout}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
