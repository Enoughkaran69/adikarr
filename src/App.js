import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import SplashScreen from './SplashScreen';
import LoginPage from './LoginPage';
import MainPage from './MainPage';
import HomePage from './HomePage';
import MusicPage from './MusicPage';
import EventPage from './EventPage';
import ChatPage from './ChatPage';
import { auth } from './firebase';
import './App.css';
import GlobalAudioPlayer from './components/GlobalAudioPlayer';

import { SharedDataProvider } from './contexts/SharedDataContext';
import { MusicProvider } from './contexts/MusicContext';

function AppWrapper() {
  return (
    <Router>
      <MusicProvider>
      <SharedDataProvider>
        <App />
      </SharedDataProvider>
      </MusicProvider>
    </Router>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    // Clean up the listener on component unmount
    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs once on mount

  const onLoginCheck = (page) => {
    // This function might need adjustment depending on how SplashScreen uses it
    // With async auth check, SplashScreen might not need to navigate based on initial sync check
    // For now, keeping it as is, but it might become redundant or need logic change
    if (page === 'home') {
      navigate('/home');
    } else if (page === 'main') {
      navigate('/main');
    } else {
      navigate('/login');
    }
  };

  if (loading) {
    // Show a loading indicator or SplashScreen while auth state is being determined
    return <SplashScreen onLoginCheck={onLoginCheck} />;
  }

  // After loading, render routes based on user state
  return (
    <div className="App">
      <Routes>
        {/* The initial path might still show SplashScreen briefly or redirect based on auth state */}
        <Route path="/" element={user ? <Navigate to="/main" /> : <SplashScreen onLoginCheck={onLoginCheck} />} />
        <Route path="/login" element={user ? <Navigate to="/main" /> : <LoginPage onLoginSuccess={() => navigate('/main')} />} />

        {/* Protected Routes */}
        <Route path="/main" element={user ? <MainPage /> : <Navigate to="/login" />} />
        <Route
          path="/home"
          element={
            user ?
            <HomePage
              onNavigateToMusicPage={() => navigate('/music')}
              onNavigateToEventPage={() => navigate('/event')}
            /> :
            <Navigate to="/login" />
          }
        />
        <Route path="/music" element={user ?  <MusicPage onBack={() => navigate('/home')} /> : // <-- Add the onBack prop here
            <Navigate to="/login" />
          }
        />
        <Route path="/event" element={user ? <EventPage /> : <Navigate to="/login" />} />
        <Route path="/chat" element={user ? <ChatPage onBack={() => navigate('/home')} /> : <Navigate to="/login" />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <GlobalAudioPlayer />
    </div>
  );
}

export default AppWrapper;