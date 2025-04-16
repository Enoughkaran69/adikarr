import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import logo from './logo.svg';
import './SplashScreen.css';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

function SplashScreen({ onLoginCheck }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.partner) {
              setTimeout(() => onLoginCheck('home'), 2000);
            } else {
              setTimeout(() => onLoginCheck('main'), 2000);
            }
          } else {
            setTimeout(() => onLoginCheck('login'), 2000);
          }
        } else {
          setTimeout(() => onLoginCheck('login'), 2000);
        }
      } catch (error) {
        console.error('Error checking user:', error);
        setTimeout(() => onLoginCheck('login'), 2000);
      }
    };

    const timeout = setTimeout(() => {
      setIsLoading(false);
      checkUser();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [onLoginCheck]);

  return (
    <div className="SplashScreen">
      <div className="animated-background">
        <div className="animated-circle circle-1" />
        <div className="animated-circle circle-2" />
      </div>
      
      <motion.div 
        className="splash-content"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.img
          src={logo}
          className="App-logo"
          alt="logo"
          animate={{
            y: [0, -20, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.h1 
          className="splash-title"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Adikar
        </motion.h1>
        
        <motion.p 
          className="splash-subtitle"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Connect with your loved ones
        </motion.p>

        {isLoading && (
          <div className="loading-dots">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default SplashScreen;