import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './SplashScreen.css';
import { auth } from './firebase';

function SplashScreen({ onLoginCheck }) {
  const [transition, setTransition] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const user = auth.currentUser;
      if (user) {
        onLoginCheck(true); // User is logged in
      } else {
        onLoginCheck(false); // User is not logged in
      }
    };

    const timeout = setTimeout(() => {
      setTransition(true);
      checkUser();
    }, 3000); // Splash screen duration

    return () => clearTimeout(timeout);
  }, [onLoginCheck]);

  return (
    <div className={`SplashScreen ${transition ? 'logo-transition' : ''}`}>
      <img src={logo} className="App-logo" alt="logo" />
    </div>
  );
}

export default SplashScreen;