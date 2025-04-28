import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import './HomePage.css';
import { auth, db } from './firebase';
import { doc, getDoc, updateDoc, writeBatch, deleteField, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import defaultProfile from './logo.png';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
    IconButton, Tooltip, Menu, MenuItem, Box, Typography, Switch, Paper, Grid, Button as MuiButton // Renamed Button to MuiButton to avoid conflict
} from '@mui/material'; // Import necessary MUI components
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EventIcon from '@mui/icons-material/Event'; // Icon for Events button
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'; // Icon for Chat button
import MusicNoteIcon from '@mui/icons-material/MusicNote'; // Icon for Music button
import PlayArrowIcon from '@mui/icons-material/PlayArrow'; // Custom player icons
import PauseIcon from '@mui/icons-material/Pause'; // Custom player icons

import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

import { useSharedData } from './contexts/SharedDataContext';
import { MusicContext } from './contexts/MusicContext';

// Custom markers for the map (keep as is)
const createCustomIcon = (color) => new L.Icon({
  iconUrl: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>`,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -32]
});

const userIcon = createCustomIcon('%23FF4081'); // Pinkish
const partnerIcon = createCustomIcon('%234CAF50'); // Green

// --- Custom Audio Player ---
// (Using MUI icons for play/pause)
function CustomAudioPlayer({ src }) {
  const { isPlaying, setIsPlaying, audioRef, setCurrentTrack } = useContext(MusicContext);

  const togglePlayPause = () => {
    if (isPlaying) {
        setIsPlaying(false)
    } else {
        if (src){
            setCurrentTrack(src)
            setIsPlaying(true);
        }
    }
  };
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const onSeek = (e) => {
    if (!audioRef.current || !duration) return;
    // Calculate seek position relative to the progress bar clicked
    const progressBar = e.currentTarget;
    const clickPosition = e.nativeEvent.offsetX;
    const barWidth = progressBar.clientWidth;
    const newTime = (clickPosition / barWidth) * duration;

    if (isFinite(newTime)) { // Ensure newTime is a valid number
        audioRef.current.currentTime = newTime;
        setProgress(newTime);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    audioRef.current?.addEventListener('timeupdate', onTimeUpdate);
    audioRef.current?.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audioRef.current?.removeEventListener('timeupdate', onTimeUpdate);
      audioRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [src]);

  return (
    <>
        <div className="custom-audio-player">
          <IconButton onClick={togglePlayPause} size="small" className="play-pause-button-mui">
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </div>
        <div className="audio-progress-container">
          <div className="audio-time current-time">{formatTime(progress)}</div>
          <div className="audio-progress" onClick={onSeek}>
            <div className="audio-progress-filled" style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' }} />
          </div>
          <div className="audio-time duration-time">{formatTime(duration)}</div>
        </div>
    </>

   
  );
}
// --- End Custom Audio Player ---


function HomePage({ onNavigateToMusicPage, onNavigateToEventPage }) {
  const user = auth.currentUser;
  const [partner, setPartner] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [distance, setDistance] = useState('...'); // Default to ...
  const [error, setError] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // New loading state
  const [showMap, setShowMap] = useState(false);
  const [partnerId, setPartnerId] = useState(null);
  const navigate = useNavigate();

  const { sharedSong, lastMessages } = useSharedData();

  const { setIsPlaying, setCurrentTrack } = useContext(MusicContext);
  const [songs, setSongs] = useState(["https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"]);

  // Fetch and cache partner data logic
  useEffect(() => {
    const fetchPartnerData = async () => {
      if (!user) return;

      // Check if partner data is cached in localStorage
      const cachedPartnerData = localStorage.getItem('partnerData');
      if (cachedPartnerData) {
        const parsedData = JSON.parse(cachedPartnerData);
        setPartner(parsedData.partner);
        setPartnerId(parsedData.partner?.uid); // Assuming partner data includes UID
        setIsLoading(false);
        return; // Skip fetching from Firestore
      }

      // If not in localStorage, fetch from Firestore
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.partner) {
            const partnerDocRef = doc(db, 'users', userData.partner);
            const partnerDocSnap = await getDoc(partnerDocRef);
            if (partnerDocSnap.exists()) {
              const partnerData = partnerDocSnap.data();
              setPartner(partnerData);
              setPartnerId(userData.partner);
              // Cache data in localStorage
              localStorage.setItem('partnerData', JSON.stringify({ partner: partnerData }));
              setIsLoading(false); // Data loaded
            } else {
              console.warn("Partner document not found for ID:", userData.partner);
              setIsLoading(false); // No partner found
              setPartner(null); // Clear partner if doc doesn't exist
              setPartnerId(null);
            }
          }else {
              setPartnerId(null);
              setPartner(null); // Clear partner if not set in user doc
              setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching partnerId and data:', error);
        setError("Could not load partner information.");
        setIsLoading(false);
      }
    };
    fetchPartnerData();
    // Consider adding a listener here if partner changes often without page reload
  }, [user]);


  // Menu handlers (keep as is)
  const handleMenuOpen = (event) => setMenuAnchorEl(event.currentTarget);
  const handleMenuClose = () => setMenuAnchorEl(null);

  // Breakup and Logout handlers (keep as is)
  const handleBreakup = async () => {
    handleMenuClose(); // Close menu after action
    if (!partner && !partnerId) { // Check both partner state and fetched partnerId
        alert('No partner to disconnect.');
        return;
    }
    const currentPartnerId = partnerId || partner?.id; // Use fetched ID or ID from partner state
    if (!currentPartnerId) {
        alert('Cannot determine partner ID.');
        return;
    }

    // Confirmation dialog
    if (!window.confirm("Are you sure you want to disconnect from your partner?")) {
        return;
    }
    localStorage.removeItem('partnerData');

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const partnerDocRef = doc(db, 'users', currentPartnerId);

        // Check if partner document actually exists before trying to update it
        const partnerDoc = await getDoc(partnerDocRef);

        const batch = writeBatch(db);

        // Update user's document
        batch.update(userDocRef, { partner: deleteField() });

        // Update partner's document only if it exists
        if (partnerDoc.exists()) {
            batch.update(partnerDocRef, { partner: deleteField() });
        } else {
            console.warn("Partner document didn't exist, only updating current user.");
        }

        await batch.commit();

        setPartner(null);
        setPartnerId(null); // Clear partnerId state
        setPartnerLocation(null); // Clear partner location
        alert('You have disconnected from your partner.');
        navigate('/main'); // Navigate back to main page after breakup
    } catch (error) {
        console.error('Error during breakup:', error);
        alert('Failed to disconnect. Please try again.');
    }
};


  const handleLogout = async () => {
    handleMenuClose(); // Close menu
    localStorage.removeItem('partnerData');
    try {
      await auth.signOut();
      // No need to navigate here, App.js handles redirection on auth state change
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Failed to log out. Please try again.');
    }
  };


  // Fetch user data and location (modified to use partnerId)
  useEffect(() => {
    let userLocationWatcher = null;
    let partnerListenerUnsubscribe = () => {};

    const fetchAndWatchUserData = async () => {
      if (!user) return;

      const userDocRef = doc(db, 'users', user.uid);

      // Get initial user location and update Firestore
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: Date.now() // Add timestamp
            };
            setUserLocation(newLocation);
            localStorage.setItem('userLocation', JSON.stringify(newLocation));
            try {
              await updateDoc(userDocRef, { location: newLocation });
            } catch (updateError) {
              console.error("Error updating user location:", updateError);
            }
          },
          (geoError) => {
           
            console.error('Geolocation error:', geoError);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 } // Options
        );

        // Optional: Watch position for real-time updates (can be battery intensive)
        // userLocationWatcher = navigator.geolocation.watchPosition(...)

      } else {
        setError('Geolocation is not supported by this browser.');
      }

      // Listen for partner's location changes if partnerId exists and map is shown
      if (partnerId && showMap) {
        const partnerDocRef = doc(db, 'users', partnerId);
        partnerListenerUnsubscribe = onSnapshot(partnerDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const partnerData = docSnap.data();
            // Update partner state only if needed (e.g., name change)
            // setPartner(prev => ({ ...prev, ...partnerData })); // Careful with overwrites
            if (partnerData.location) {
              setPartnerLocation(partnerData.location);
              // Update cache if needed
              localStorage.setItem('partnerData', JSON.stringify({
                partner: partnerData, // Cache full partner data
                partnerLocation: partnerData.location,
              }));
            } else {
              setPartnerLocation(null); // Partner has no location shared
            }
          } else {
            setError('Partner data not found.');
            setPartner(null);
            setPartnerLocation(null);
            localStorage.removeItem('partnerData');
          }
        }, (firestoreError) => {
          setError('Error listening to partner data.');
          console.error('Partner listener error:', firestoreError);
          setPartnerLocation(null);
        });
      } else {
        // If map is hidden or no partner, clear partner location
        setPartnerLocation(null);
      }
    };

    fetchAndWatchUserData();

    // Cleanup function
    return () => {
      if (userLocationWatcher) {
        navigator.geolocation.clearWatch(userLocationWatcher);
      }
      partnerListenerUnsubscribe(); // Unsubscribe from partner listener
    };
  }, [user, partnerId, showMap]); // Dependencies

  // Calculate distance (keep as is, but handle null locations better)
  useEffect(() => {
    if (userLocation?.lat && userLocation?.lng && partnerLocation?.lat && partnerLocation?.lng) {
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
      setDistance(`${calculatedDistance.toFixed(1)} km`); // Use 1 decimal place
    } else {
      setDistance('...'); // Show ... if locations are missing
    }
  }, [userLocation, partnerLocation]);

  // Memoized Map (keep as is)
  const memoizedMap = useMemo(() => {
    // Ensure both locations have valid lat/lng before rendering
    if (showMap && userLocation?.lat && userLocation?.lng && partnerLocation?.lat && partnerLocation?.lng) {
      const centerPosition = [
          (userLocation.lat + partnerLocation.lat) / 2,
          (userLocation.lng + partnerLocation.lng) / 2
      ];
      // Calculate bounds to fit both markers
      const bounds = L.latLngBounds([userLocation.lat, userLocation.lng], [partnerLocation.lat, partnerLocation.lng]);

      return (
        <MapContainer
            bounds={bounds} // Use bounds to set initial view
            boundsOptions={{ padding: [50, 50] }} // Add padding
            style={{ height: '350px', width: '100%', borderRadius: '8px', marginTop: '15px' }} // Style map
            scrollWheelZoom={false} // Disable scroll wheel zoom for better mobile UX
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" // Standard OSM tiles
            // url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // Alternative nice tiles (CartoDB Voyager)
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
          <Marker position={[partnerLocation.lat, partnerLocation.lng]} icon={partnerIcon}>
            <Popup>{partner?.name || 'Partner'}'s location</Popup>
          </Marker>
          <Polyline
            positions={[[userLocation.lat, userLocation.lng], [partnerLocation.lat, partnerLocation.lng]]}
            color="#FF4081" // Match user icon color
            weight={3}
            opacity={0.7}
            dashArray="5, 10"
          />
        </MapContainer>
      );
    }
    return null; // Return null if map shouldn't be shown or locations are invalid
  }, [showMap, userLocation, partnerLocation, partner?.name]); // Include partner.name in dependencies

  const playSong = () => {
    setCurrentTrack("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
    setIsPlaying(true);
  }

  const changeTrack = () => {
    const randomIndex = Math.floor(Math.random() * songs.length);
    setCurrentTrack(songs[randomIndex]);
    setIsPlaying(true);
  }

  return (
    <div className="HomePage">
      {/* Header (keep as is) */}
      <div className="heading">
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
          MenuListProps={{ 'aria-labelledby': 'basic-button' }} // Accessibility
        >
          <MenuItem onClick={handleBreakup} disabled={!partner && !partnerId}>Disconnect</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </div>

      {/* Error Display */}
      {error && (
        <Paper elevation={2} sx={{ p: 1.5, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="body2">{error}</Typography>
        </Paper>
      )}

      {/* Profile Section (modified to use isLoading) */}
      <div className="profile-container">
        <div className="partner-profile"> 
          <img
            src={user?.photoURL || defaultProfile}
            alt="Your Profile"
            className="profile-image"
            onError={(e) => e.target.src = defaultProfile}
          />
          <Typography variant="h6" component="h2">{user?.displayName || "You"}</Typography> 
        </div>
        <div className="connection-indicator">
        
        {isLoading && (
            <div className="loading-indicator">
              Loading... 
            </div>
          )}
          <FavoriteIcon className="heart-icon" />
        </div>
        <div className="partner-profile">
          <img
            src={partner?.photoURL || defaultProfile}
            alt="Partner Profile"
            className="profile-image"
            onError={(e) => e.target.src = defaultProfile}
          />
          <Typography variant="h6" component="h2">{partner?.name || "Partner"}</Typography>
          {isLoading && (
            <div className="loading-indicator">
              Loading... 
            </div>
          )}
        </div>
      </div>

      {/* Shared Song Section (Enhanced Styling) */}
      {sharedSong && (
       
            <div className="shared-song-display" role="region" aria-label="Shared Song">
                <div className="shared-song-row">
                    {sharedSong.thumbnail && (
                    <img
                        src={sharedSong.thumbnail}
                        alt={`${sharedSong.name} thumbnail`}
                        className="song-thumbnail-small"
                        onClick={() => onNavigateToMusicPage()} // Keep navigation on click
                        style={{ cursor: 'pointer' }}
                    />
                    )}
                    <div className="song-info-row">
                        <div className="song-details-row">
                            <Typography variant="subtitle1" className="song-title" noWrap>
                                {sharedSong.name || "Unknown Song"}
                            </Typography>
                            <Typography variant="body2" className="song-artist" noWrap sx={{ opacity: 0.8 }}>
                                by {sharedSong.artist || "Unknown Artist"}
                            </Typography>
                        </div>
                        {sharedSong.downloadUrl && (
                            <CustomAudioPlayer src={sharedSong.downloadUrl} />
                        )}
                    </div>
                </div>
            </div>
      
      )}


      {/* --- Enhanced "Other Items" Section --- */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(100, 100, 100, 0.06)', backdropFilter: 'blur(5px)' }}>

        {/* Location Toggle and Info */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
            <LocationOnIcon sx={{ mr: 1, fontSize: '1.2rem', opacity: 0.8, color: '#fff23c' }} />
          
            Share Location
          </Typography>
          <Box display="flex" alignItems="center">
             {showMap && userLocation && partnerLocation && (
                <Typography variant="body2" sx={{ mr: 1, opacity: 0.9,color: 'white' }}>
                    {distance} apart
                </Typography>
             )}
             
         
  <Switch
            className="location-switch" // Add a specific class name
            checked={showMap}
            onChange={() => setShowMap(!showMap)}
            color="white" // Use a standard theme color like "primary" or "secondary"
                           // Or remove this prop if you want to define the active color solely in CSS
            inputProps={{ 'aria-label': 'Toggle location sharing map' }}
          />

          </Box>
        </Box>

        {/* Render Map inside this Paper if shown */}
        {showMap && memoizedMap}

        {/* Recent Chat Preview */}
        {lastMessages.length > 0 && (
          <Box
            className="chat-preview-box"
            onClick={() => navigate('/chat')}
            sx={{
              mt: showMap ? 2 : 0, // Add margin top if map is shown
              p: 1.5,
              
              borderRadius: '8px',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(131, 130, 130, 0)' }
            }}
          >

            {lastMessages.map((msg) => {
              const isSent = msg.senderId === user?.uid; // Safe check for user
              const senderProfilePic = isSent ? user?.photoURL : partner?.photoURL;
              // const senderName = isSent ? 'You' : (partner?.name || 'Partner'); // Not needed for preview
              return (
                <Box key={msg.id} display="flex" alignItems="center" mb={0.5} className={`chat-popup-message ${isSent ? 'sent' : 'received'}`}>
                  <img
                    src={senderProfilePic || defaultProfile}
                    alt="" // Decorative image
                    className="chat-popup-message-icon"
                    onError={(e) => { e.target.src = defaultProfile; }}
                  />
                  <Typography variant="body2" className="chat-popup-text" noWrap sx={{ flexGrow: 1, opacity: isSent ? 0.8 : 1 }}>
                    {msg.text}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Action Buttons Grid */}
        <Box mt={2 }> {/* Add margin top */}
          <Grid container spacing={2}>
            <Grid item xs={3}> {/* Adjust xs based on how many buttons */}
              {/* Converted to standard button with btn class */}
              <button
                className="btn" // Apply the requested class
                onClick={onNavigateToEventPage}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} // Mimic fullWidth and center content
              >
                <EventIcon fontSize="small" sx={{ mr: 0.5 }} /> {/* Keep icon inside */}
                Events
              </button>
            </Grid>
            <Grid item xs={4}>
              {/* Converted MuiButton to standard button with btn class */}
              <button
                className="btn" // Apply the requested class
                onClick={() => navigate('/chat')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} // Mimic fullWidth and center content
              >
                <ChatBubbleOutlineIcon fontSize="small" sx={{ mr: 0.5 }} /> {/* Keep icon inside */}
                Chat
              </button>
            </Grid>
            <Grid item xs={4}>
              {/* Converted MuiButton to standard button with btn class */}
              <button
                className="btn" // Apply the requested class
                onClick={onNavigateToMusicPage}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} // Mimic fullWidth and center content
              >
                <MusicNoteIcon fontSize="small" sx={{ mr: 0.5 }} /> {/* Keep icon inside */}
                Music
              </button>
            </Grid>
          </Grid>
        </Box>


      </Paper>
      {/* --- End Enhanced "Other Items" Section --- */}

      {/* Removed the old map-container and map-info divs */}

    </div> // End HomePage
  );
}

export default HomePage;
