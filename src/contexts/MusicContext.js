import React, { createContext, useState, useRef } from 'react';

const MusicContext = createContext();

const MusicProvider = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const audioRef = useRef(null);

  return (
    <MusicContext.Provider value={{ isPlaying, setIsPlaying, currentTrack, setCurrentTrack, audioRef }}>
      {children}
    </MusicContext.Provider>
  );
};

export { MusicContext, MusicProvider };