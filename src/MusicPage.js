import React, { useState, useRef, useEffect } from 'react';
import './MusicPage.css'; // Make sure this CSS file exists and is imported
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import SearchIcon from '@mui/icons-material/Search'; // Import Search icon
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Import Back icon
import PlayArrowIcon from '@mui/icons-material/PlayArrow'; // Import Play icon
import QueueMusicIcon from '@mui/icons-material/QueueMusic'; // Import Set icon (example)
import { IconButton, CircularProgress, Tooltip } from '@mui/material'; // Import Material UI components

function MusicPage({ onBack }) {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSongUrl, setCurrentSongUrl] = useState(null);
  const [currentSongQuality, setCurrentSongQuality] = useState(null);
  const [currentPlayingSongId, setCurrentPlayingSongId] = useState(null); // Track which song is playing
  const [partnerId, setPartnerId] = useState(null);
  const [sharedSong, setSharedSong] = useState(null);
  const audioRef = useRef(null);

  const searchSongs = async (searchQuery) => {
    if (!searchQuery) return;
    setLoading(true);
    setError(null);
    setSongs([]);
    setCurrentSongUrl(null); // Clear current song when searching
    setCurrentPlayingSongId(null);
    try {
      // Using the suggested API endpoint structure
      const response = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(searchQuery)}&limit=20`);
      if (!response.ok) {
        throw new Error(`Failed to fetch songs (Status: ${response.status})`);
      }
      const data = await response.json();
      console.log('API response:', data);

      // Adjust based on the actual API response structure
      if (data?.success && data?.data?.results && Array.isArray(data.data.results)) {
         setSongs(data.data.results);
      } else if (data?.data?.songs?.results && Array.isArray(data.data.songs.results)) {
         // Fallback for potential structure variations
         setSongs(data.data.songs.results);
      }
       else {
        console.warn('Unexpected API response structure:', data);
        setSongs([]);
        setError('No songs found or unexpected format.');
      }
    } catch (err) {
      console.error("Error fetching songs:", err);
      setError(err.message || 'Error fetching songs');
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuery('latest hindi'); // More specific initial query
    searchSongs('latest hindi');

    const fetchPartnerId = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const userDocRef = doc(db, 'users', user.uid);
      try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.partner) {
            setPartnerId(userData.partner);
          }
        }
      } catch (error) {
        console.error("Error fetching partner ID:", error);
      }
    };

    fetchPartnerId();
  }, []); // Run only on mount

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
        // Optional: Automatically play the shared song if it changes?
        // Be cautious with autoplay due to browser restrictions.
        // if (songData.downloadUrl && songData.downloadUrl !== currentSongUrl) {
        //   setCurrentSongUrl(songData.downloadUrl);
        //   setCurrentSongQuality(songData.quality || 'Unknown');
        //   setCurrentPlayingSongId(null); // Indicate it's the shared song, not one from the list
        //   // Attempt to play (might require user interaction)
        //   setTimeout(() => audioRef.current?.play().catch(e => console.log("Autoplay prevented:", e)), 100);
        // }
      } else {
        setSharedSong(null);
        // Optional: Stop playback if shared song is removed?
        // if (audioRef.current && !currentPlayingSongId) { // Only stop if shared song was playing
        //    audioRef.current.pause();
        //    setCurrentSongUrl(null);
        // }
      }
    }, (error) => {
      console.error("Error listening to shared song:", error);
      setSharedSong(null); // Clear on error
    });

    return () => unsubscribe();
  }, [partnerId]); // Rerun when partnerId changes

  const handleSearch = (e) => {
    e.preventDefault();
    searchSongs(query);
  };

  const getBestQualityUrl = (song) => {
     if (!song?.downloadUrl || !Array.isArray(song.downloadUrl) || song.downloadUrl.length === 0) {
       return null;
     }
     // Prefer 320kbps, then 160kbps, then 96kbps, then the first available
     const qualityOrder = ['320kbps', '160kbps', '96kbps'];
     for (const quality of qualityOrder) {
       const found = song.downloadUrl.find(url => url.quality === quality);
       if (found) return found;
     }
     // Fallback to the first URL object if specific qualities aren't found
     return song.downloadUrl[0];
   };


  const handlePlaySong = (song) => {
    const bestUrlObj = getBestQualityUrl(song);

    if (bestUrlObj?.url) {
      if (audioRef.current) {
        audioRef.current.pause(); // Pause current before loading new
      }
      setCurrentSongUrl(bestUrlObj.url);
      setCurrentSongQuality(bestUrlObj.quality || 'Unknown');
      setCurrentPlayingSongId(song.id); // Track the playing song ID

      // Use setTimeout to ensure state update before load/play
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load(); // Load the new source
          audioRef.current.play().catch((error) => {
            console.error('Error playing audio:', error);
            // Inform user playback failed (e.g., browser restriction)
            setError('Playback failed. Browser may require interaction.');
          });
        }
      }, 50); // Small delay
    } else {
      setError(`No playable URL found for "${song.name}".`);
      setCurrentSongUrl(null);
      setCurrentPlayingSongId(null);
    }
  };

  const handleSetSong = async (song) => {
    const user = auth.currentUser;
    if (!user || !partnerId) {
      alert('User or partner not connected. Cannot set shared song.');
      return;
    }

    const bestUrlObj = getBestQualityUrl(song);
    if (!bestUrlObj?.url) {
      alert(`Could not find a suitable download URL for "${song.name}".`);
      return;
    }

    const docId = [user.uid, partnerId].sort().join('_');
    const sharedSongDocRef = doc(db, 'sharedSongs', docId);

    try {
      await setDoc(sharedSongDocRef, {
        id: song.id, // Store song ID for reference
        name: song.name || 'Unknown Song',
        artist: song.artists?.primary?.[0]?.name || song.primaryArtists || 'Unknown Artist', // Handle different API structures
        downloadUrl: bestUrlObj.url,
        quality: bestUrlObj.quality || 'Unknown',
        timestamp: Date.now(),
        thumbnail: song.image?.find(img => img.quality === '150x150')?.url || song.image?.[1]?.url || song.image?.[0]?.url || null, // Prefer 150x150
        setBy: user.uid, // Track who set the song
      });
      // Optional: Provide feedback
      // alert(`"${song.name}" set as shared song!`);
    } catch (error) {
      console.error("Error setting shared song:", error);
      alert('Failed to set shared song. Please try again.');
    }
  };

  // Function to safely get artist name
  const getArtistName = (song) => {
    if (song.artists?.primary?.length > 0) return song.artists.primary.map(a => a.name).join(', ');
    if (song.primaryArtists) return song.primaryArtists; // Fallback for different API structure
    if (song.artist) return song.artist; // Another fallback
    return 'Unknown Artist';
  };

  // Function to safely get thumbnail URL
  const getThumbnail = (song) => {
    if (!song.image || !Array.isArray(song.image)) return ''; // Default or placeholder image URL
    // Prefer 150x150, then 50x50, then the last available
    const preferred = song.image.find(img => img.quality === '150x150');
    if (preferred) return preferred.url;
    const medium = song.image.find(img => img.quality === '50x50');
    if (medium) return medium.url;
    return song.image[song.image.length - 1]?.url || ''; // Fallback to last or empty
  }

  return (
    // Add the main container div
    <div className="MusicPage">
      {/* Add the background container */}
      <div className="background-container"></div>

      {/* Header */}
      <div className="music-header">
        <IconButton onClick={onBack} aria-label="Back" className="back-button-music">
          <ArrowBackIcon />
        </IconButton>
        <h2 className="music-heading-title">Find & Share Music</h2>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search for songs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
          aria-label="Search songs input"
        />
        <IconButton type="submit" className="search-button" aria-label="Search">
          <SearchIcon />
        </IconButton>
      </form>

      {/* Loading and Error States */}
      {loading && (
        <div className="loading-container">
          <CircularProgress color="inherit" size={30} />
          <p>Loading songs...</p>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}

      {/* Song List */}
      {!loading && songs.length === 0 && !error && (
        <p className="info-text">No songs found. Try a different search!</p>
      )}
      <ul className="song-list">
        {Array.isArray(songs) && songs.map((song) => (
          <li
            key={song.id}
            className={`song-item ${currentPlayingSongId === song.id ? 'playing' : ''} ${sharedSong?.id === song.id ? 'shared' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`Play ${song.name} by ${getArtistName(song)}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePlaySong(song); }}
          >
            <img
              src={getThumbnail(song)}
              alt={`${song.name} album art`}
              className="song-image"
              onClick={() => handlePlaySong(song)} // Play on image click
              loading="lazy" // Lazy load images
            />
            <div className="song-info" onClick={() => handlePlaySong(song)}>
              <div className="song-name" title={song.name}>{song.name}</div>
              <div className="song-artist" title={getArtistName(song)}>{getArtistName(song)}</div>
            </div>
            <div className="song-actions">
              <Tooltip title="Play Song">
                <IconButton
                  className="play-button"
                  onClick={() => handlePlaySong(song)}
                  aria-label={`Play ${song.name}`}
                  size="small"
                >
                  <PlayArrowIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Set as Shared Song">
                <IconButton
                  className="set-button"
                  onClick={() => handleSetSong(song)}
                  aria-label={`Set ${song.name} as shared song`}
                  size="small"
                  disabled={!partnerId} // Disable if no partner
                >
                  <QueueMusicIcon />
                </IconButton>
              </Tooltip>
            </div>
             {/* Indicate if this is the currently shared song */}
             {sharedSong?.id === song.id && <div className="shared-indicator">Shared</div>}
          </li>
        ))}
      </ul>

      {/* Sticky Audio Player Area */}
      {(currentSongUrl || sharedSong) && (
        <div className="audio-player-sticky-container">
          {/* Display currently set shared song if no song is actively playing */}
          {!currentSongUrl && sharedSong && (
            <div className="shared-song-info-player">
              <p>Shared: <strong>{sharedSong.name}</strong> by {sharedSong.artist}</p>
              {/* Optional: Add a button to play the shared song */}
              {/* <IconButton onClick={() => handlePlaySong(sharedSong)}><PlayArrowIcon /></IconButton> */}
            </div>
          )}

          {/* Audio Player - only render if there's a URL */}
          {currentSongUrl && (
            <div className="audio-player-wrapper">
              <audio controls ref={audioRef} className="audio-player" key={currentSongUrl} preload="metadata">
                <source src={currentSongUrl} type="audio/mp4" /> {/* Use mp4 type which is common */}
                Your browser does not support the audio element.
              </audio>
              {currentSongQuality && <div className="audio-quality">Quality: {currentSongQuality}</div>}
            </div>
          )}
        </div>
      )}
    </div> // End of MusicPage div
  );
}

export default MusicPage;
