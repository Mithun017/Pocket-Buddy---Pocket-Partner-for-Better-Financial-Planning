import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8000';

const Profile = () => {
  const { user, fetchProfile, logout } = useAuth();
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
    'Stocks', 'Mutual Funds', 'Bonds', 'Fixed Deposits', 'Real Estate', 'Gold', 'Cryptocurrency'
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/profile`);
      if (response.data.profile) {
        // Ensure values are strings for input fields to avoid uncontrolled/controlled issues
        const p = response.data.profile;
        setProfile({
          age: p.age ?? '',
          income: p.income ?? '',
          savings: p.savings ?? '',
          risk_appetite: p.risk_appetite || 'medium',
          financial_goals: p.financial_goals || 'long-term',
          investment_preferences: p.investment_preferences || []
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage('New profile setup required.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
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
    setLoading(true);

    try {
      await axios.post(`${API_URL}/user/profile`, profile);
      setMessage('Profile updated successfully!');
      await fetchProfile(); // Sync global auth context
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Failed to save profile. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading your profile...</div>;

  return (
    <div className="profile-page">
      <h1>👤 My Financial Profile</h1>
      
      {message && <div className={`success-message ${message.includes('Failed') ? 'error' : ''}`}>{message}</div>}

      <div className="profile-form">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                value={profile.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                placeholder="Enter your age"
                required
              />
            </div>
            <div className="form-group">
              <label>Annual Income (₹)</label>
              <input
                type="number"
                value={profile.income}
                onChange={(e) => handleInputChange('income', e.target.value)}
                placeholder="e.g. 1000000"
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
                onChange={(e) => handleInputChange('savings', e.target.value)}
                placeholder="e.g. 500000"
                required
              />
            </div>
            <div className="form-group">
              <label>Risk Appetite</label>
              <select
                value={profile.risk_appetite}
                onChange={(e) => handleInputChange('risk_appetite', e.target.value)}
                required
              >
                <option value="low">Low - Prefer safety over returns</option>
                <option value="medium">Medium - Balanced approach</option>
                <option value="high">High - Comfortable with volatility</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Financial Goals</label>
            <select
              value={profile.financial_goals}
              onChange={(e) => handleInputChange('financial_goals', e.target.value)}
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
                <div key={option} className={`checkbox-item ${profile.investment_preferences.includes(option) ? 'active' : ''}`} onClick={() => handleCheckbox(option)}>
                  <input
                    type="checkbox"
                    checked={profile.investment_preferences.includes(option)}
                    readOnly
                  />
                  <span>{option}</span>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Processing...' : 'Save Profile Changes'}
          </button>
        </form>

        <div className="profile-footer">
          <button className="btn-logout-alt" onClick={logout}>
            🚪 Logout from Pocket Buddy
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
