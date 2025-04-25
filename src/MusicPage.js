import React, { useState, useRef, useEffect } from 'react';
import './MusicPage.css';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

function MusicPage({ onBack }) {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSongUrl, setCurrentSongUrl] = useState(null);
  const [currentSongQuality, setCurrentSongQuality] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [sharedSong, setSharedSong] = useState(null);
  const audioRef = useRef(null);

  const searchSongs = async (searchQuery) => {
    if (!searchQuery) return;
    setLoading(true);
    setError(null);
    setSongs([]);
    try {
      const response = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(searchQuery)}&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch songs');
      }
      const data = await response.json();
      console.log('API response:', data);
      if (data && data.data && data.data.songs && Array.isArray(data.data.songs.results)) {
        setSongs(data.data.songs.results);
      } else if (data && data.data && data.data && data.data.results) {
        // If songs.results is not an array, try to convert to array
        setSongs(Array.isArray(data.data.results) ? data.data.results : [data.data.results]);
      } else {
        setSongs([]);
      }
    } catch (err) {
      setError(err.message || 'Error fetching songs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Automatically fetch songs with query "latest" on mount
    setQuery('latest');
    searchSongs('latest');

    // Fetch partner ID from Firestore
    const fetchPartnerId = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.partner) {
          setPartnerId(userData.partner);
        }
      }
    };

    fetchPartnerId();
  }, []);

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
        setSharedSong(docSnap.data());
        if (docSnap.data().downloadUrl) {
          setCurrentSongUrl(docSnap.data().downloadUrl);
          setCurrentSongQuality(docSnap.data().quality || 'Unknown');
          if (audioRef.current) {
            audioRef.current.load();
            audioRef.current.play().catch((error) => {
              console.error('Error playing audio:', error);
            });
          }
        }
      } else {
        setSharedSong(null);
        setCurrentSongUrl(null);
        setCurrentSongQuality(null);
      }
    });

    return () => unsubscribe();
  }, [partnerId]);

  const handleSearch = (e) => {
    e.preventDefault();
    searchSongs(query);
  };

  const handlePlaySong = (song) => {
    if (song.downloadUrl && song.downloadUrl.length > 0) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // Find the downloadUrl with max quality
      const maxQualityUrlObj = song.downloadUrl.reduce((max, current) => {
        const getQualityValue = (q) => {
          if (!q) return 0;
          const match = q.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };
        return getQualityValue(current.quality) > getQualityValue(max.quality) ? current : max;
      }, song.downloadUrl[0]);

      setCurrentSongUrl(maxQualityUrlObj.url);
      setCurrentSongQuality(maxQualityUrlObj.quality || 'Unknown');
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load();
          audioRef.current.play().catch((error) => {
            console.error('Error playing audio:', error);
          });
        }
      }, 100);
    } else {
      alert('No playable URL found for this song.');
    }
  };

  const handleSetSong = async (song) => {
    const user = auth.currentUser;
    if (!user || !partnerId) {
      alert('User or partner not connected.');
      return;
    }
    // Find max quality URL
    const maxQualityUrlObj = song.downloadUrl.reduce((max, current) => {
      const getQualityValue = (q) => {
        if (!q) return 0;
        const match = q.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return getQualityValue(current.quality) > getQualityValue(max.quality) ? current : max;
    }, song.downloadUrl[0]);

    // Create shared doc ID
    const docId = [user.uid, partnerId].sort().join('_');
    const sharedSongDocRef = doc(db, 'sharedSongs', docId);

    // Write song data to Firestore
    await setDoc(sharedSongDocRef, {
      name: song.name,
      artist: song.artists && song.artists.primary && song.artists.primary.length > 0 ? song.artists.primary[0].name : 'Unknown Artist',
      downloadUrl: maxQualityUrlObj.url,
      quality: maxQualityUrlObj.quality || 'Unknown',
      timestamp: Date.now(),
      thumbnail: song.image && song.image.length > 2 ? song.image[2].url : null,
    });
  };

  return (
    <div className="MusicPage">
      <h2 className="heading-title">Music Search</h2>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search for songs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="btn menu-button">Search</button>
        <button type="button" onClick={onBack} className="btn menu-button">Back</button>
      </form>
      {loading && <p>Loading songs...</p>}
      {error && <p className="error-text">{error}</p>}
      <ul className="song-list">
        {Array.isArray(songs) && songs.length > 0 ? (
          songs.map((song) => (
            <li
              key={song.id}
              className="song-item"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePlaySong(song); }}
              role="button"
              aria-pressed="false"
            >
              <img
                src={
                  song.image && song.image.length > 2 && song.image[2].url
                    ? song.image[2].url
                    : ''
                }
                alt={song.name}
                className="song-image"
                onClick={() => handlePlaySong(song)}
              />
              <div className="song-info" onClick={() => handlePlaySong(song)}>
                <div className="song-name">{song.name}</div>
                <div className="song-artist">
                  {song.artists && song.artists.primary && song.artists.primary.length > 0
                    ? song.artists.primary[0].name
                    : 'Unknown Artist'}
                </div>
              </div>
              <button className="btn menu-button set-button" onClick={() => handleSetSong(song)}>Set</button>
            </li>
          ))
        ) : (
          <li>No songs found</li>
        )}
      </ul>
      {sharedSong && (
        <div className="shared-song-info">
          <h3>Currently Set Song</h3>
          <p><strong>{sharedSong.name}</strong> by {sharedSong.artist}</p>
        </div>
      )}
      {currentSongUrl && (
        <div className="audio-player-container">
          <audio controls ref={audioRef} className="audio-player" key={currentSongUrl}>
            <source src={currentSongUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <div className="audio-quality">Quality: {currentSongQuality}</div>
        </div>
      )}
    </div>
  );
}

export default MusicPage;
