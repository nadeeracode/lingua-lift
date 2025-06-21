import React from 'react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome to LinguaLift</h1>
        <div className="user-info">
          <span>Hello, {user?.email}!</span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>
      
      <main className="dashboard-content">
        <p>Dashboard content will go here...</p>
        <p>Your decks and study sessions will be displayed here.</p>
      </main>
    </div>
  );
};

export default Dashboard;