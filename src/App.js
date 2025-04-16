import React, { useState } from 'react';
import SplashScreen from './SplashScreen';
import LoginPage from './LoginPage';
import MainPage from './MainPage';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('splash');

  const handleLoginCheck = (isLoggedIn) => {
    setCurrentPage(isLoggedIn ? 'main' : 'login');
  };

  const handleLoginSuccess = () => {
    setCurrentPage('main');
  };

  return (
    <div className="App">
      {currentPage === 'splash' && <SplashScreen onLoginCheck={handleLoginCheck} />}
      {currentPage === 'login' && <LoginPage onLoginSuccess={handleLoginSuccess} />}
      {currentPage === 'main' && <MainPage />}
    </div>
  );
}

export default App;
