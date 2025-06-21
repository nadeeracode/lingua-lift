import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <h1>LinguaLift</h1>
          <Routes>
            <Route path="/" element={<div>Welcome to LinguaLift!</div>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
