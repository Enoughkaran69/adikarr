import React, { useState } from 'react';
import SplashScreen from './SplashScreen';
import LoginPage from './LoginPage';
import MainPage from './MainPage';
import HomePage from './HomePage';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('splash');

  const handleLoginCheck = (page) => {
    setCurrentPage(page);
  };

  const handleLoginSuccess = () => {
    setCurrentPage('main');
  };

  const handleLogout = () => {
    setCurrentPage('login');
  };

  return (
    <div className="App">
      {currentPage === 'splash' && <SplashScreen onLoginCheck={handleLoginCheck} />}
      {currentPage === 'login' && <LoginPage onLoginSuccess={handleLoginSuccess} />}
      {currentPage === 'main' && <MainPage onLogout={handleLogout} />}
      {currentPage === 'home' && <HomePage />}
    </div>
  );
}

export default App;
