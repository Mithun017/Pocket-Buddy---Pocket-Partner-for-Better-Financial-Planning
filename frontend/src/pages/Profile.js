import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';

const API_URL = 'http://localhost:8000';

const Profile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    age: '',
    income: '',
    savings: '',
    risk_appetite: 'medium',
    financial_goals: 'long-term',
    investment_preferences: []
  });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

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
    // Fetch existing profile
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/user/profile`);
        if (response.data.profile) {
          setFormData(response.data.profile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCheckbox = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData({
        ...formData,
        investment_preferences: [...formData.investment_preferences, value]
      });
    } else {
      setFormData({
        ...formData,
        investment_preferences: formData.investment_preferences.filter(p => p !== value)
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API_URL}/user/profile`, formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
      <h1>Complete Your Profile</h1>

      {success && (
        <div className="success-message">
          Profile saved successfully! Redirecting...
        </div>
      )}

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Annual Income (₹)</label>
            <input
              type="number"
              name="income"
              value={formData.income}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Current Savings (₹)</label>
            <input
              type="number"
              name="savings"
              value={formData.savings}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Risk Appetite</label>
            <select
              name="risk_appetite"
              value={formData.risk_appetite}
              onChange={handleChange}
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
            name="financial_goals"
            value={formData.financial_goals}
            onChange={handleChange}
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
              <div key={option} className="checkbox-item">
                <input
                  type="checkbox"
                  id={option}
                  value={option}
                  checked={formData.investment_preferences.includes(option)}
                  onChange={handleCheckbox}
                />
                <label htmlFor={option}>{option}</label>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default Profile;
