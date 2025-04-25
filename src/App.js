import React, { useState } from 'react';
import SplashScreen from './SplashScreen';
import LoginPage from './LoginPage';
import MainPage from './MainPage';
import HomePage from './HomePage';
import MusicPage from './MusicPage';
import EventPage from './EventPage';
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

  const navigateToMusicPage = () => {
    setCurrentPage('music');
  };

  const navigateBackToHome = () => {
    setCurrentPage('home');
  };

  const navigateToEventPage = () => {
    setCurrentPage('event');
  };

  const navigateBackFromEvent = () => {
    setCurrentPage('home');
  };

  return (
    <div className="App">
      {currentPage === 'splash' && <SplashScreen onLoginCheck={handleLoginCheck} />}
      {currentPage === 'login' && <LoginPage onLoginSuccess={handleLoginSuccess} />}
      {currentPage === 'main' && <MainPage onLogout={handleLogout} />}
      {currentPage === 'home' && <HomePage onNavigateToMusicPage={navigateToMusicPage} onNavigateToEventPage={navigateToEventPage} />}
      {currentPage === 'music' && <MusicPage onBack={navigateBackToHome} />}
      {currentPage === 'event' && <EventPage onBack={navigateBackFromEvent} />}
    </div>
  );
}

export default App;
