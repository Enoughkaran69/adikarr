import React, { useState, useEffect } from 'react';
import './MainPage.css';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField, query, where, collection, getDocs, onSnapshot, writeBatch } from 'firebase/firestore';
import defaultProfile from './logo.png';

function MainPage({ onLogout }) {
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
      // Ensure partnerCode is set to the correct partner document ID
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (!userData.partner) {
          alert('No partner to disconnect.');
          return;
        }

        const partnerDocRef = doc(db, 'users', userData.partner);
        const partnerDoc = await getDoc(partnerDocRef);

        if (!partnerDoc.exists()) {
          alert('Partner document does not exist.');
          return;
        }

        // Update both users to remove the partner field
        const batch = writeBatch(db);
        const userDocRef = doc(db, 'users', user.uid);

        batch.update(userDocRef, { partner: deleteField() });
        batch.update(partnerDocRef, { partner: deleteField() });

        await batch.commit();

        setPartner(null);
        setPartnerCode('');
        alert('You have disconnected from your partner.');
      } else {
        alert('User document does not exist.');
      }
    } catch (error) {
      console.error('Error during breakup:', error);
      alert('Failed to disconnect. Please try again.');
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
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  const handleGoToHome = () => {
    window.location.reload();
  };

  return (
    <div className="MainPage">
      
      <div className ="heading">
      <div>
      <div className="heading-title">ADI KAR</div>
      <div className="sub-title">CONNECTING COUPLES</div>
    </div>
    <button className="btn" onClick={handleLogout}>LOG OUT </button>
  </div>

        <h1>Welcome, {user?.displayName || 'Friend'}!</h1>
        <div className="contents">
        <div className="user-details">

       
      
       
          
        
        {user && (
          
            <div className={` ${partner ? 'connected' : ''}`}>
              <div className="user-proc">
                <img 
                    src={user && user.photoURL ? user.photoURL : defaultProfile} 
                    alt="Profile" 
                    className="user-profile"
                    onError={(e) => e.target.src = defaultProfile}
                />
                <div className="user-info">
                    <p1>{user?.displayName}</p1>
                </div>
                </div>
                <div className="code-section">
                    <div className="code-display">
                        <strong>Your Code:</strong> 
                        <span>{userCode}</span>
                    </div>
                    <div className="code-actions">
                        <button onClick={handleCopyCode} title="Copy to clipboard">
                            <span role="img" aria-label="copy">📋</span>
                        </button>
                        <button onClick={handleShareCode} title="Share code">
                            <span role="img" aria-label="share">📤</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {partner && (
            <div className="partner-details">
                <div className="partner-header">
                    <h2>Connected with</h2>
                    <div className="partner-profile-section">
                        <img 
                            src={partner && partner.profilePicture ? partner.profilePicture : defaultProfile} 
                            alt="Partner Profile" 
                            className="user-profile"
                            onError={(e) => e.target.src = defaultProfile}
                        />
                        <h3>{partner?.name}</h3>
                    </div>
                </div>
                <div className="button-group">
                    <button onClick={handleBreakup} className="btn">
                        <span role="img" aria-label="disconnect">💔</span> Disconnect
                    </button>
                    <button onClick={handleGoToHome} className="btn">
                        <span role="img" aria-label="home">🏠</span> Visit Home
                    </button>
                </div>
            </div>
        )}

        {!partner && (
            <div className="partner-section">
                <h2>Connect with Partner</h2>
                <div className="partner-box">
                    <input
                        type="text"
                        placeholder="Enter partner code"
                        value={partnerCode}
                        tabIndex={0}
                        onChange={(e) => {
                          console.log('Partner code input changed:', e.target.value);
                          setPartnerCode(e.target.value);
                        }} // Ensure this updates the state
                    />
                    <button onClick={handleSetPartner} className="btn">
                        <span role="img" aria-label="connect">🤝</span> Connect
                    </button>
                </div>
             
            </div>
        )}


    </div>
     </div>
     </div>
  );
}

export default MainPage;