import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './SplashScreen.css';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import heartIcon from './logo.png';
import { CircularProgress, Typography, Box } from '@mui/material';
import { onAuthStateChanged } from 'firebase/auth';

function SplashScreen({ onLoginCheck }) {
  const [transition, setTransition] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.partner) {
              onLoginCheck('home');
            } else {
              onLoginCheck('main');
            }
          } else {
            onLoginCheck('login');
          }
        } catch (error) {
          console.error('Error checking user:', error);
          onLoginCheck('login');
        }
      } else {
        onLoginCheck('login');
      }
      setIsLoading(false);
    });

    const timeout = setTimeout(() => {
      setTransition(true);
    }, 3000);

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [onLoginCheck]);

  return (
    <div className={`SplashScreen ${transition ? 'logo-transition' : ''}`}>
      <div className="background-container"></div>
      <div className="splash-content">
        <div className="splash-logo-container">
          <img src={heartIcon} className="heart-logo" alt="Heart logo" />
          {isLoading && (
            <CircularProgress
              size={24}
              style={{
                position: 'absolute',
                bottom: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#fff'
              }}
            />
          )}
        </div>
        <Typography 
                    variant="h1" 
                    component="h1" 
                    sx={{ 
                      fontWeight: 700,
                      color: '#fff',
                      fontSize: 'clamp(2rem, 5vw, 3rem)',
                      marginBottom: 2,
                      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    ADIKAR
                  </Typography>
        
                  <Typography 
                    variant="subtitle1"
                    sx={{ 
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '1.1rem',
                      mb: 4,
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    Continue your journey of love
                  </Typography>
        
        <div className="splash-hearts">
          <span role="img" aria-label="heart">❤️</span>
          <span role="img" aria-label="sparkling heart">💕</span>
          <span role="img" aria-label="heart">❤️</span>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
