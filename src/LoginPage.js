import React from 'react';
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

      // Generate a unique code for the user if it doesn't already exist
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userCode;
      if (userDoc.exists()) {
        userCode = userDoc.data().code || uuidv4().slice(0, 8);
      } else {
        userCode = uuidv4().slice(0, 8);
      }

      // Save user details to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name: user.displayName,
        email: user.email,
        uid: user.uid,
        profilePicture: user.photoURL,
        code: userCode, // Ensure the code remains the same
      }, { merge: true });

      console.log('User Info:', user);

      // Notify parent component about login success
      onLoginSuccess();
    } catch (error) {
      console.error('Error during Google login:', error);
      alert('Failed to login with Google. Please try again.');
    }
  };

  return (
    <div className="LoginPage">
      <div className="login-container">
        <img src={logo} alt="Adikar Logo" className="LoginPage-logo" />
        <h1>Welcome back!</h1>
        <p>Sign in to continue your journey with Adikar</p>
        <button className="google-login-button" onClick={handleGoogleLogin}>
          <img 
            src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg"
            alt="Google"
          />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default LoginPage;