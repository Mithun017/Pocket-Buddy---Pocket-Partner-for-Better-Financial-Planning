import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8000';

const Profile = () => {
  const { user, fetchProfile, logout } = useAuth();
  const navigate = useNavigate(); // Keep navigate if needed for other purposes, though not for redirect after save
  const [profile, setProfile] = useState({
    age: '',
    income: '',
    savings: '',
    risk_appetite: 'medium',
    financial_goals: 'long-term',
    investment_preferences: []
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const investmentOptions = [
    'Stocks',
    'Mutual Funds',
    'Bonds',
    'Fixed Deposits',
    'Real Estate',
    'Gold',
    'Cryptocurrency'
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/profile`);
      if (response.data.profile) {
        setProfile(response.data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage('Error fetching profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckbox = (preference) => {
    setProfile(prev => ({
      ...prev,
      investment_preferences: prev.investment_preferences.includes(preference)
        ? prev.investment_preferences.filter(p => p !== preference)
        : [...prev.investment_preferences, preference]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Re-enable loading for save operation

    try {
      await axios.post(`${API_URL}/user/profile`, profile);
      setMessage('Profile updated successfully!');
      await fetchProfile(); // Sync header
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading profile...</div>;

  return (
    <div className="profile-page">
      <h1>👤 My Financial Profile</h1>
      
      {message && <div className="success-message">{message}</div>}

      <div className="profile-form">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Annual Income (₹)</label>
              <input
                type="number"
                value={profile.income}
                onChange={(e) => setProfile({ ...profile, income: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Current Savings (₹)</label>
              <input
                type="number"
                value={profile.savings}
                onChange={(e) => setProfile({ ...profile, savings: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Risk Appetite</label>
              <select
                value={profile.risk_appetite}
                onChange={(e) => setProfile({ ...profile, risk_appetite: e.target.value })}
                required
              >
                <option value="low">Low - Prefer safety over returns</option>
                <option value="medium">Medium - Balanced approach</option>
                <option value="high">High - Comfortable with volatility for higher returns</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Financial Goals</label>
            <select
              value={profile.financial_goals}
              onChange={(e) => setProfile({ ...profile, financial_goals: e.target.value })}
              required
            >
              <option value="short-term">Short-term (Under 3 years)</option>
              <option value="long-term">Long-term (3+ years)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Investment Preferences</label>
            <div className="checkbox-group">
              {investmentOptions.map(option => (
                <div key={option} className="checkbox-item" onClick={() => handleCheckbox(option)}>
                  <input
                    type="checkbox"
                    id={option}
                    value={option}
                    checked={profile.investment_preferences.includes(option)}
                    readOnly // Make it readOnly as click handler is on div
                  />
                  <label htmlFor={option}>{option}</label>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>

        <div className="profile-footer">
          <p className="footer-note">Manage your account and security</p>
          <button className="btn-logout-alt" onClick={logout}>
            <span className="logout-icon">🚪</span> Sign Out of Pocket Buddy
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
