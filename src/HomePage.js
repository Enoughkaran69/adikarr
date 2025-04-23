import React, { useState, useEffect, useMemo } from 'react';
import './HomePage.css';
import { auth, db } from './firebase';
import { doc, getDoc, updateDoc, writeBatch, deleteField } from 'firebase/firestore';
import defaultProfile from './logo.svg';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FavoriteIcon from '@mui/icons-material/Favorite';
import L from 'leaflet';

// Custom markers for the map
const createCustomIcon = (color) => new L.Icon({
  iconUrl: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>`,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -32]
});

const userIcon = createCustomIcon('%23FF4081');
const partnerIcon = createCustomIcon('%234CAF50');

function HomePage() {
  const user = auth.currentUser;
  const [partner, setPartner] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [distance, setDistance] = useState('Calculating...');
  const [error, setError] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleBreakup = async () => {
    if (!partner) return;

    try {
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

        const batch = writeBatch(db);
        const userDocRef = doc(db, 'users', user.uid);

        batch.update(userDocRef, { partner: deleteField() });
        batch.update(partnerDocRef, { partner: deleteField() });

        await batch.commit();

        setPartner(null);
        alert('You have disconnected from your partner.');
        window.location.reload(); // Reload the page after disconnecting
      } else {
        alert('User document does not exist.');
      }
    } catch (error) {
      console.error('Error during breakup:', error);
      alert('Failed to disconnect. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  // Cache last known data for offline support
  useEffect(() => {
    const cachedUserLocation = localStorage.getItem('userLocation');
    const cachedPartnerData = localStorage.getItem('partnerData');

    if (cachedUserLocation) {
      setUserLocation(JSON.parse(cachedUserLocation));
    }

    if (cachedPartnerData) {
      const parsedData = JSON.parse(cachedPartnerData);
      setPartner(parsedData.partner);
      setPartnerLocation(parsedData.partnerLocation);
    }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Update user's location in Firestore on page load
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(async (position) => {
                const newLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
                setUserLocation(newLocation);
                localStorage.setItem('userLocation', JSON.stringify(newLocation));
                await updateDoc(userDocRef, { location: newLocation });
              }, (geoError) => {
                setError('Failed to fetch your location. Please enable location services.');
                console.error('Geolocation error:', geoError);
              });
            } else {
              setError('Geolocation is not supported by your browser.');
            }

            if (userData.partner) {
              const partnerDocRef = doc(db, 'users', userData.partner);
              const partnerDoc = await getDoc(partnerDocRef);

              if (partnerDoc.exists()) {
                const partnerData = partnerDoc.data();
                setPartner(partnerData);
                setPartnerLocation(partnerData.location);
                localStorage.setItem('partnerData', JSON.stringify({
                  partner: partnerData,
                  partnerLocation: partnerData.location,
                }));
              } else {
                setError('Failed to fetch partner data.');
              }
            }
          } else {
            setError('Failed to fetch user data.');
          }
        }
      } catch (firestoreError) {
        setError('An error occurred while fetching data. Please try again later.');
        console.error('Firestore error:', firestoreError);
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (userLocation && partnerLocation) {
      const R = 6371; // Radius of the Earth in km
      const dLat = ((partnerLocation.lat - userLocation.lat) * Math.PI) / 180;
      const dLng = ((partnerLocation.lng - userLocation.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLocation.lat * Math.PI) / 180) *
          Math.cos((partnerLocation.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const calculatedDistance = R * c;
      setDistance(`${calculatedDistance.toFixed(2)} km`);
    } else {
      setDistance('Calculating...');
    }
  }, [userLocation, partnerLocation]);

  const memoizedMap = useMemo(() => {
    if (userLocation && partnerLocation) {
      return (
        <MapContainer center={userLocation} zoom={13} style={{ height: '400px', width: '100%' }}>
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          />
          <Marker position={userLocation} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
          <Marker position={partnerLocation} icon={partnerIcon}>
            <Popup>{partner?.name || 'Partner'}'s location</Popup>
          </Marker>
          <Polyline 
            positions={[userLocation, partnerLocation]}
            color="#FF4081"
            weight={3}
            opacity={0.6}
            dashArray="10, 10"
          />
        </MapContainer>
      );
    }
    return null;
  }, [userLocation, partnerLocation]);

  return (
    <div className="HomePage">
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      <div className="header">
        <h1>Connected with {partner?.name || 'Partner'}</h1>
        <Tooltip title="Menu">
          <IconButton className="menu-button" onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleBreakup}>Disconnect</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </div>

      <div className="profile-container">
        <div className="user-profile">
          <img 
            src={user?.photoURL || defaultProfile} 
            alt="Your Profile" 
            className="profile-image"
            onError={(e) => e.target.src = defaultProfile}
          />
          <h2>{user?.displayName}</h2>
        </div>

        <div className="connection-indicator">
          <FavoriteIcon className="heart-icon" />
        </div>

        <div className="partner-profile">
          <img 
            src={partner?.profilePicture || defaultProfile} 
            alt="Partner Profile" 
            className="profile-image"
            onError={(e) => e.target.src = defaultProfile}
          />
          <h2>{partner?.name}</h2>
        </div>
      </div>

      {memoizedMap && (
        <div className="map-container">
          {memoizedMap}
          <div className="map-info">
            <div className="info-row">
              <div className="distance-info">
                <LocationOnIcon />
                <span>
                  Distance: <strong>{distance}</strong>
                </span>
              </div>
              <div className="timestamp-info">
                <AccessTimeIcon />
                <span>Last updated: Just now</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;