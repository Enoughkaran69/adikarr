import React from 'react';
import { motion } from 'framer-motion';
import logo from './logo.svg';
import './LoginPage.css';
import { auth, provider, signInWithPopup } from './firebase';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();

function LoginPage({ onLoginSuccess }) {
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userCode;
      if (userDoc.exists()) {
        userCode = userDoc.data().code || uuidv4().slice(0, 8);
      } else {
        userCode = uuidv4().slice(0, 8);
      }

      await setDoc(doc(db, 'users', user.uid), {
        name: user.displayName,
        email: user.email,
        uid: user.uid,
        profilePicture: user.photoURL,
        code: userCode,
      }, { merge: true });

      onLoginSuccess();
    } catch (error) {
      console.error('Error during Google login:', error);
      // Show error toast
      const errorToast = document.createElement('div');
      errorToast.className = 'toast toast-error';
      errorToast.textContent = 'Failed to login. Please try again.';
      document.querySelector('.toast-container')?.appendChild(errorToast);
      setTimeout(() => errorToast.remove(), 3000);
    }
  };

  return (
    <div className="LoginPage">
      <div className="background-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
      </div>

      <motion.div 
        className="login-container"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.img
          src={logo}
          alt="Adikar Logo"
          className="LoginPage-logo"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Welcome to Adikar
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Connect with your loved ones in a meaningful way
        </motion.p>

        <motion.button
          className="google-login-button"
          onClick={handleGoogleLogin}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <img 
            src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
            alt="Google"
          />
          Continue with Google
        </motion.button>
      </motion.div>

      <div className="toast-container"></div>
    </div>
  );
}

export default LoginPage;