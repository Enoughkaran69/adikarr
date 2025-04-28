import React, { useContext, useEffect } from 'react';import './GlobalAudioPlayer.css';
import { MusicContext } from '../contexts/MusicContext';

function GlobalAudioPlayer() {
  const { isPlaying, setIsPlaying, currentTrack, setCurrentTrack, audioRef } = useContext(MusicContext);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error("Error playing audio:", error);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack, setIsPlaying, audioRef]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleEnded = () => {
    audioRef.current.pause();
    setIsPlaying(false);
    setCurrentTrack(null);
  };

  return (
    <div className="custom-audio-player">
      <audio ref={audioRef} src={currentTrack} onEnded={handleEnded} style={{ display: 'none' }} />
     
    </div>
  );
}

export default GlobalAudioPlayer;
