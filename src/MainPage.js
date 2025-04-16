import React, { useState, useEffect } from 'react';
import './MainPage.css';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField, query, where, collection, getDocs, onSnapshot } from 'firebase/firestore';
import defaultProfile from './logo.svg';

function MainPage() {
  const user = auth.currentUser;
  const [partnerCode, setPartnerCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [partner, setPartner] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);

        // Set up a real-time listener for the user's document
        const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            setUserCode(data.code || '');

            if (data.partner) {
              const fetchPartnerData = async () => {
                const partnerDoc = await getDoc(doc(db, 'users', data.partner));
                if (partnerDoc.exists()) {
                  setPartner(partnerDoc.data());
                } else {
                  setPartner(null); // Partner document no longer exists
                }
              };
              fetchPartnerData();
            } else {
              setPartner(null); // No partner assigned
            }
          }
        });

        return () => unsubscribe(); // Clean up the listener on unmount
      }
    };

    fetchUserData();
  }, [user]);

  const handleSetPartner = async (event) => {
    event.preventDefault(); // Prevent page reload
    if (!partnerCode) return alert('Please enter a partner code.');
    if (partner) return alert('You are already connected to a partner.');

    try {
      // Query Firestore to find a user with the entered partner code
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('code', '==', partnerCode));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const partnerDoc = querySnapshot.docs[0];
        const partnerData = partnerDoc.data();

        if (partnerData.partner) {
          return alert('The entered code is already connected to another user.');
        }

        // Update both users to set them as partners
        await updateDoc(doc(db, 'users', user.uid), { partner: partnerDoc.id });
        await updateDoc(doc(db, 'users', partnerDoc.id), { partner: user.uid });

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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(userCode);
    alert('Code copied to clipboard!');
  };

  const handleShareCode = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Partner Code',
        text: `Here is my partner code: ${userCode}`,
      }).catch((error) => console.error('Error sharing code:', error));
    } else {
      alert('Sharing is not supported on this device.');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.reload(); // Reload to go back to SplashScreen
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Failed to log out. Please try again.');
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
          <button onClick={handleCopyCode}>Copy Code</button>
          <button onClick={handleShareCode}>Share Code</button>
        </div>
      )}

      <>
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
      </>
      <button className="logout-button" onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default MainPage;