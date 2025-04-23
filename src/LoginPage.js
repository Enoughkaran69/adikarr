import React, { useState } from 'react';
import heartIcon from './logo.png';
import './LoginPage.css';
import { auth, provider, signInWithPopup, setPersistence, browserLocalPersistence } from './firebase';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { CircularProgress, Typography, Box } from '@mui/material';

const db = getFirestore();

function LoginPage({ onLoginSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userCode = userDoc.exists() ? (userDoc.data().code || uuidv4().slice(0, 8)) : uuidv4().slice(0, 8);

      await setDoc(doc(db, 'users', user.uid), {
        name: user.displayName,
        email: user.email,
        uid: user.uid,
        photoURL: user.photoURL, // Changed from profilePicture to photoURL
        code: userCode,
        lastLogin: new Date().toISOString(),
        loginCount: userDoc.exists() ? (userDoc.data().loginCount || 0) + 1 : 1
      }, { merge: true });

      onLoginSuccess();
    } catch (error) {
      console.error('Error during Google login:', error);
      setError('Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="LoginPage">
      <div className="background-container"></div>
      <div className="login-container">
        <div className="login-content">
          <div className="logo-container">
            <img 
              src={heartIcon} 
              alt="Adikar Logo" 
              className="login-logo"
            />
           
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

          <Box className="login-card">
            {error && (
              <Box className="error-message">
                {error}
              </Box>
            )}

            <button
              className={`google-login-button ${isLoading ? 'loading' : ''}`}
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <>
                  <img 
                    src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
                    alt="Google"
                    style={{ width: '24px', height: '24px' }}
                  />
                  Continue with Google
                </>
              )}
            </button>
          </Box>

          <Typography 
            variant="caption" 
            className="login-footer"
            sx={{ 
              color: 'rgba(255,255,255,0.7)',
              fontSize: '0.85rem',
              mt: 3,
              display: 'block'
            }}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Typography>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;