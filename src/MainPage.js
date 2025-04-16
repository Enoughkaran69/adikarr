import React from 'react';
import './MainPage.css';
import { auth } from './firebase';
import defaultProfile from './logo.svg'; // Fallback image

function MainPage() {
  const user = auth.currentUser;

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
         
        </div>
      )}
      <button className="logout-button" onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default MainPage;