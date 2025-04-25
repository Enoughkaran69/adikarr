
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './HomePage.css';
import { auth, db } from './firebase';
import { doc, getDoc, updateDoc, writeBatch, deleteField, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import defaultProfile from './logo.png';
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

function CustomAudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const onSeek = (e) => {
    if (!audioRef.current) return;
    const newTime = e.nativeEvent.offsetX / e.currentTarget.clientWidth * duration;
    audioRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="custom-audio-player">
      <button className="play-pause-button" onClick={togglePlayPause}>
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <div className="audio-progress" onClick={onSeek}>
        <div className="audio-progress-filled" style={{ width: `${(progress / duration) * 100}%` }} />
      </div>
      <div className="audio-time">{formatTime(progress)} / {formatTime(duration)}</div>
      <audio
        ref={audioRef}
        src={src}
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        preload="metadata"
      />
    </div>
  );
}

function HomePage({ onNavigateToMusicPage, onNavigateToEventPage }) {
  const user = auth.currentUser;
  const [partner, setPartner] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [distance, setDistance] = useState('Calculating...');
  const [error, setError] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [partnerId, setPartnerId] = useState(null);
  const [sharedSong, setSharedSong] = useState(null);
  const [lastMessages, setLastMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  // Fetch partnerId on mount or when user changes, independent of showMap
  useEffect(() => {
    const fetchPartnerId = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.partner) {
            setPartnerId(userData.partner);
          }
        }
      } catch (error) {
        console.error('Error fetching partnerId:', error);
      }
    };
    fetchPartnerId();
  }, [user]);

 

  // Set up sharedSong listener when partnerId changes, independent of showMap
  useEffect(() => {
    if (!partnerId) return;
    const user = auth.currentUser;
    if (!user) return;

    const docId = [user.uid, partnerId].sort().join('_');
    const sharedSongDocRef = doc(db, 'sharedSongs', docId);

    const unsubscribe = onSnapshot(sharedSongDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const songData = docSnap.data();
        setSharedSong(songData);
      } else {
        setSharedSong(null);
      }
    });

    // Fetch last 2 chat messages
    const messagesCollectionRef = collection(db, 'chats', docId, 'messages');
    const messagesQuery = query(messagesCollectionRef, orderBy('createdAt', 'desc'), limit(2));
    const unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      setLastMessages(msgs.reverse());
    });

    return () => {
      unsubscribe();
      unsubscribeMessages();
    };
  }, [partnerId]);

  // Handle Notify button click using Firestore for notification
  const handleNotifyClick = async () => {
    if (!partnerId) {
      alert('No partner connected to notify.');
      return;
    }

  };

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
        if (user && showMap) {
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
        } else {
          // Clear error and location if showMap is false
          setError(null);
          setUserLocation(null);
          setPartnerLocation(null);
        }
      } catch (firestoreError) {
        setError('An error occurred while fetching data. Please try again later.');
        console.error('Firestore error:', firestoreError);
      }
    };

    fetchUserData();
  }, [user , showMap]);

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

  useEffect(() => {
    if (!partnerId) return;
    const user = auth.currentUser;
    if (!user) return;

    // Create a consistent doc ID for shared song between two users (sorted IDs)
    const docId = [user.uid, partnerId].sort().join('_');
    const sharedSongDocRef = doc(db, 'sharedSongs', docId);

    // Listen for real-time updates on shared song
    const unsubscribe = onSnapshot(sharedSongDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const songData = docSnap.data();
        // alert(`Currently set song: ${songData.name} by ${songData.artist}`);
        setSharedSong(songData);
      }
    });

    return () => unsubscribe();
  }, [partnerId]);

  if (showChat && partner) {
    const ChatPage = require('./ChatPage').default;
    return <ChatPage user={user} partner={partner} onBack={() => setShowChat(false)} />;
  }

  return (
    <div className="HomePage">
            <div className ="heading">
      <div>
      <div className="heading-title">ADI KAR</div>
      <div className="sub-title">CONNECTING COUPLES</div>
    </div>
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
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
     

      <div className="profile-container">
        <div className="partner-profile">
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

      <div className="shared-song-container">
          {sharedSong && (
          <div className="shared-song-display" role="region" aria-label="Shared Song">
            <div className="shared-song-row">
              {sharedSong.thumbnail && (
                <img
                  src={sharedSong.thumbnail}
                  alt={`${sharedSong.name} thumbnail`}
                  className="song-thumbnail-small"
                  onClick={() => onNavigateToMusicPage()}
                  style={{ cursor: 'pointer' }}
                />
              )}
              <div className="song-info-row">
                <div className="song-details-row">
                  <p className="song-title"><strong>{sharedSong.name}</strong></p>
                  <p className="song-artist">by {sharedSong.artist}</p>
                </div>
                {sharedSong.downloadUrl && (
                  <CustomAudioPlayer src={sharedSong.downloadUrl} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
     
      <div className="other-item">
            
      <div className="switch-container">
                Location<input 
        type="checkbox" 
        id="switch" 
        checked={showMap} 
        onChange={() => setShowMap(!showMap)} 
      />
      <label htmlFor="switch">Toggle</label>
      </div>
            
      {/* Last 2 chat messages popup */}
      {lastMessages.length > 0 && (
        <div className="chat-popup" onClick={() => setShowChat(true)} role="button" tabIndex={0} onKeyPress={() => setShowChat(true)} aria-label="Open chat">
          {lastMessages.map((msg) => {
            const isSent = msg.senderId === user.uid;
            const senderProfilePic = isSent ? user.photoURL : partner?.profilePicture;
            const senderName = isSent ? (user.displayName || 'You') : (partner?.name || 'Partner');
            return (
              <div key={msg.id} className={`chat-popup-message ${isSent ? 'sent' : 'received'}`}>
                <img
                  src={senderProfilePic || './logo.png'}
                  alt={`${senderName} profile`}
                  className="chat-popup-message-icon"
                  onError={(e) => { e.target.src = './logo.png'; }}
                />
                <span className="chat-popup-text">{msg.text}</span>
              </div>
            );
          })}
        </div>
      )}
      
              {/* Added 4 buttons aligned */} 
              <div className="button-group">
              <button className="btn" onClick={onNavigateToEventPage}>
                <span role="img" aria-label="events" className="btn-icon">📅</span> Events
              </button>
                <button className="btn" onClick={() => setShowChat(true)}>
                  <span role="img" aria-label="chat" className="btn-icon">💬</span> Chat
                </button>
                
                {/* Removed Music button as thumbnail click navigates to music page */} 
                <button className="btn" onClick={() => onNavigateToMusicPage()}>Music</button> 
              </div>
              </div>

      {showMap && memoizedMap && (
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
            
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
