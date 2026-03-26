import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const API_URL = 'http://localhost:8000';

const Dashboard = () => {
  const { user } = useAuth();
  const [marketData, setMarketData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [marketRes, profileRes] = await Promise.all([
        axios.get(`${API_URL}/market/indices`),
        axios.get(`${API_URL}/user/profile`)
      ]);
      setMarketData(marketRes.data);
      setProfile(profileRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {user?.full_name}! 👋</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Quick Actions */}
        <div className="card">
          <h3>⚡ Quick Actions</h3>
          <div className="quick-links">
            <Link to="/profile" className="quick-link">👤 Update Profile</Link>
            <Link to="/recommendations" className="quick-link">💰 Recommendations</Link>
            <Link to="/market" className="quick-link">📈 Market Insights</Link>
          </div>
        </div>

        {/* Market Overview */}
        <div className="card">
          <h3>📊 Market Overview</h3>
          <div className="market-preview">
            {marketData && Object.entries(marketData)
              .filter(([key]) => key !== 'last_updated')
              .map(([key, data]) => (
                <div key={key} className={`market-item ${data.change >= 0 ? 'positive' : 'negative'}`}>
                  <span className="market-name">{key.replace(/_/g, ' ')}</span>
                  <span className="market-value">{data.value?.toLocaleString()}</span>
                  <span className={`market-change ${data.change >= 0 ? 'positive' : 'negative'}`}>
                    {data.change >= 0 ? '▲' : '▼'} {data.change_pct}%
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Profile Status */}
        <div className="card">
          <h3>👤 Your Profile</h3>
          {profile?.profile ? (
            <div className="profile-status">
              <p><strong>Age:</strong> {profile.profile.age}</p>
              <p><strong>Risk Appetite:</strong> {profile.profile.risk_appetite}</p>
              <p><strong>Financial Goal:</strong> {profile.profile.financial_goals}</p>
              <p><strong>Annual Income:</strong> ₹{profile.profile.income?.toLocaleString()}</p>
              <Link to="/recommendations" className="btn-secondary">Get Recommendations →</Link>
            </div>
          ) : (
            <div className="profile-status">
              <p>Complete your profile to get personalized recommendations.</p>
              <Link to="/profile" className="btn-secondary">Complete Profile →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
