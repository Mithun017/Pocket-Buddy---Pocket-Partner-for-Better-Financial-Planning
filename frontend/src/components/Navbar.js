import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  useEffect(() => {
    // ... handleClickOutside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/profile', label: 'Profile', icon: '👤' },
    { path: '/recommendations', label: 'Invest', icon: '💰' },
    { path: '/market', label: 'Market', icon: '📈' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/dashboard" className="navbar-brand" onClick={() => setIsDropdownOpen(false)}>
          <span className="brand-icon">💰</span>
          <span className="brand-text">Pocket Buddy</span>
        </Link>

        <div className="navbar-links">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsDropdownOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="navbar-profile" ref={dropdownRef}>
          <button 
            className={`profile-trigger ${isDropdownOpen ? 'active' : ''}`}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className="trigger-icon">👤</span>
            <span className="trigger-text">Profile</span>
          </button>

          {isDropdownOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <p className="dropdown-user-name">{user.full_name}</p>
                <p className="dropdown-user-email">{user.email}</p>
              </div>
              
              {profile ? (
                <div className="dropdown-stats">
                  <div className="stat-item">
                    <span className="stat-label">Risk Profile</span>
                    <span className="stat-value risk-value">{profile.risk_appetite}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Annual Income</span>
                    <span className="stat-value">₹{profile.income?.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Financial Goal</span>
                    <span className="stat-value">{profile.financial_goals}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Age</span>
                    <span className="stat-value">{profile.age} yrs</span>
                  </div>
                </div>
              ) : (
                <div className="dropdown-no-profile">
                  <p>Incomplete Profile</p>
                  <Link to="/profile" className="link-complete" onClick={() => setIsDropdownOpen(false)}>
                    Complete Now →
                  </Link>
                </div>
              )}

              <div className="dropdown-footer">
                <button className="dropdown-logout" onClick={handleLogout}>
                  🚪 Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
