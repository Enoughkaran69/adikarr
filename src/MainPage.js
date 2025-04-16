import React, { useState, useEffect } from 'react';
import './MainPage.css';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import defaultProfile from './logo.svg';

function MainPage() {
  const user = auth.currentUser;
  const [partnerCode, setPartnerCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [partner, setPartner] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserCode(data.code || '');
          if (data.partner) {
            const partnerDoc = await getDoc(doc(db, 'users', data.partner));
            if (partnerDoc.exists()) {
              setPartner(partnerDoc.data());
            }
          }
        }
      }
    };
    fetchUserData();
  }, [user]);

  const handleSetPartner = async () => {
    if (!partnerCode) return alert('Please enter a partner code.');
    if (partner) return alert('You are already connected to a partner.');

    try {
      const partnerDoc = await getDoc(doc(db, 'users', partnerCode));
      if (partnerDoc.exists()) {
        const partnerData = partnerDoc.data();
        if (partnerData.partner) {
          return alert('The entered code is already connected to another user.');
        }

        // Update both users to set them as partners
        await updateDoc(doc(db, 'users', user.uid), { partner: partnerCode });
        await updateDoc(doc(db, 'users', partnerCode), { partner: user.uid });

        setPartner(partnerData);
        alert('You are now connected to your partner!');
      } else {
        alert('Invalid partner code.');
      }
    } catch (error) {
      console.error('Error setting partner:', error);
      alert('Failed to connect to partner. Please try again.');
    }
  };

  const handleBreakup = async () => {
    if (!partner) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), { partner: deleteField() });
      await updateDoc(doc(db, 'users', partnerCode), { partner: deleteField() });

      setPartner(null);
      setPartnerCode('');
      alert('You have disconnected from your partner.');
    } catch (error) {
      console.error('Error during breakup:', error);
      alert('Failed to disconnect. Please try again.');
    }
  };

  const handlePoke = () => {
    if (partner) {
      alert(`You poked ${partner.name}!`);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.reload(); // Reload to go back to SplashScreen
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  return (
    <div className="MainPage">
      <h1>Welcome to the Main Page</h1>
      {user && (
        <div className="user-details">
          <img src={user.photoURL || defaultProfile} alt="Profile" className="user-profile" />
          <p><strong>Name:</strong> {user.displayName}</p>
          <p><strong>Your Code:</strong> {userCode}</p>
        </div>
      )}

      {!partner ? (
        <div className="partner-section">
          <input
            type="text"
            placeholder="Enter partner code"
            value={partnerCode}
            onChange={(e) => setPartnerCode(e.target.value)}
          />
          <button onClick={handleSetPartner}>Connect</button>
        </div>
      ) : (
        <div className="partner-details">
          <h2>Partner Details</h2>
          <p><strong>Name:</strong> {partner.name}</p>
          <button onClick={handlePoke}>Poke</button>
          <button onClick={handleBreakup}>Breakup</button>
        </div>
      )}
      <button className="logout-button" onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default MainPage;