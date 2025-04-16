import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './SplashScreen.css';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

function SplashScreen({ onLoginCheck }) {
  const [transition, setTransition] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.partner) {
            onLoginCheck('home'); // User is connected to a partner
          } else {
            onLoginCheck('main'); // User is logged in but not connected to a partner
          }
        } else {
          onLoginCheck('login'); // User document does not exist
        }
      } else {
        onLoginCheck('login'); // User is not logged in
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