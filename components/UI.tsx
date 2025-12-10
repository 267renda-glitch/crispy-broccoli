
import React, { useState, useRef, useEffect } from 'react';
import { BLESSINGS } from '../constants';
import { GestureState, TreeState } from '../types';

interface UIProps {
  onToggleState: () => void;
  currentState: TreeState;
  gestureState: GestureState;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const UI: React.FC<UIProps> = ({ onToggleState, currentState, gestureState, videoRef }) => {
  const [blessing, setBlessing] = useState<string | null>(null);
  const [showBlessing, setShowBlessing] = useState(false);
  
  // Music State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Attempt autoplay on mount
    const audio = audioRef.current;
    if (audio) {
        audio.volume = 0.2; // Soft volume
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                setIsPlaying(true);
            }).catch((error) => {
                // Autoplay usually fails without user interaction
                console.log("Autoplay prevented (waiting for user input):", error.message);
                setIsPlaying(false);
            });
        }
    }
  }, []);

  const toggleMusic = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (audio.paused) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
              playPromise
                  .then(() => setIsPlaying(true))
                  .catch(e => console.warn("Play interrupted or failed:", e));
          }
      } else {
          audio.pause();
          setIsPlaying(false);
      }
  };

  const handleBlessing = () => {
    const random = BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
    setBlessing(random.text);
    setShowBlessing(true);
    setTimeout(() => setShowBlessing(false), 5000);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
      
      {/* Audio Element - Using reliable Wikimedia source for stability */}
      <audio 
        ref={audioRef} 
        loop 
        src="https://upload.wikimedia.org/wikipedia/commons/transcoded/6/6f/Dance_of_the_Sugar_Plum_Fairy_-_Kevin_MacLeod.ogg/Dance_of_the_Sugar_Plum_Fairy_-_Kevin_MacLeod.ogg.mp3" 
        preload="auto"
        onError={() => console.warn("Audio playback failed to load source.")}
      />

      {/* Header */}
      <div className="flex justify-between items-start pointer-events-auto">
        {/* Left: Music Toggle + Hidden Video */}
        <div className="flex items-center space-x-4">
             {/* Hidden Video Feed for MediaPipe */}
            <div className="relative opacity-0 w-1 h-1 overflow-hidden pointer-events-none">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                />
            </div>
            
            <button 
                onClick={toggleMusic}
                className={`
                    w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300
                    ${isPlaying ? 'bg-pink-100 text-black border-pink-200' : 'bg-black/50 text-pink-100 border-pink-500/30'}
                `}
                aria-label="Toggle Music"
            >
                {isPlaying ? (
                    /* Pause Icon */
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                    </svg>
                ) : (
                    /* Play/Music Icon */
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    </svg>
                )}
            </button>
        </div>

        {/* Right: Blessing Button */}
        <button 
            onClick={handleBlessing}
            className="bg-pink-100 hover:bg-white text-black font-serif px-6 py-3 rounded-full shadow-[0_0_20px_rgba(252,231,243,0.3)] transition-all duration-300 transform hover:scale-105 active:scale-95 border border-pink-200"
        >
            <span className="tracking-widest text-sm uppercase font-bold">Blessing</span>
        </button>
      </div>

      {/* Center Blessing Popup */}
      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${showBlessing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
        {blessing && (
            <div className="bg-pink-100/95 text-black p-10 rounded-[2.5rem] shadow-2xl max-w-md text-center border border-pink-200 backdrop-blur-xl">
                <p className="font-serif text-2xl italic leading-relaxed font-medium">"{blessing}"</p>
                <div className="mt-6 w-8 h-0.5 bg-black/10 mx-auto"></div>
            </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex justify-center pointer-events-auto pb-8">
        <button 
            onClick={onToggleState}
            className={`
                px-10 py-4 rounded-full border backdrop-blur-md 
                transition-all duration-500 font-serif tracking-[0.2em] text-xs uppercase font-bold
                ${currentState === TreeState.CHAOS 
                    ? 'bg-black/60 text-pink-100 border-pink-500/30 hover:bg-black/80 hover:shadow-[0_0_30px_rgba(252,231,243,0.2)]' 
                    : 'bg-pink-100/10 text-pink-50 border-pink-200/20 hover:bg-pink-100/20 hover:shadow-[0_0_30px_rgba(252,231,243,0.1)]'}
            `}
        >
            {currentState === TreeState.CHAOS ? 'Restore' : 'Unleash'}
        </button>
      </div>
    </div>
  );
};

export default UI;
