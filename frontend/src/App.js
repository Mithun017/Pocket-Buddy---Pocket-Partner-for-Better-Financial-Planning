import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import ChatWidget from './components/ChatWidget';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Recommendations from './pages/Recommendations';
import Market from './pages/Market';
import Quantel from './pages/Quantel';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <ChatWidget />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/recommendations"
              element={
                <PrivateRoute>
                  <Recommendations />
                </PrivateRoute>
              }
            />
            <Route
              path="/market"
              element={
                <PrivateRoute>
                  <Market />
                </PrivateRoute>
              }
            />

            <Route
              path="/quantel"
              element={
                <PrivateRoute>
                  <Quantel />
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
