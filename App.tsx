import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import Scene from './components/Scene';
import UI from './components/UI';
import { TreeState, GestureState } from './types';
import { initializeGestureRecognizer, detectGesture } from './services/gestureService';

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.FORMED);
  const [gestureState, setGestureState] = useState<GestureState>({
    gesture: 'None',
    handPosition: { x: 0.5, y: 0.5 },
    isDetected: false,
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(0);

  // Setup Webcam and MediaPipe
  useEffect(() => {
    let active = true;

    const setupCamera = async () => {
      try {
        // Minimal constraints to maximize compatibility
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false
        });
        
        if (videoRef.current && active) {
            videoRef.current.srcObject = stream;
            // Wait for metadata to load to prevent size errors
            await new Promise((resolve) => {
                if (videoRef.current) {
                    videoRef.current.onloadedmetadata = resolve;
                }
            });
            await videoRef.current.play();
        }
      } catch (err) {
        console.warn("Camera access failed or denied. Gesture control disabled.", err);
        // App continues to function without camera
      }
    };

    const runDetection = async () => {
        try {
            const recognizer = await initializeGestureRecognizer();
            
            const loop = () => {
                if (active && videoRef.current && videoRef.current.readyState === 4 && recognizer) {
                    try {
                        const results = detectGesture(videoRef.current);
                        
                        if (results && results.landmarks.length > 0) {
                            const landmarks = results.landmarks[0];
                            const gesture = results.gestures.length > 0 ? results.gestures[0][0].categoryName : "Unknown";
                            
                            const wrist = landmarks[0]; 

                            setGestureState({
                                isDetected: true,
                                gesture: gesture,
                                handPosition: { x: 1 - wrist.x, y: wrist.y } // Mirror x
                            });

                            if (gesture === "Open_Palm") {
                                setTreeState(TreeState.CHAOS);
                            } else if (gesture === "Closed_Fist") {
                                setTreeState(TreeState.FORMED);
                            }

                        } else {
                            setGestureState(prev => ({ ...prev, isDetected: false }));
                        }
                    } catch (e) {
                        // Ignore frame errors
                    }
                }
                requestRef.current = requestAnimationFrame(loop);
            };
            loop();
        } catch (e) {
            console.warn("Gesture recognition init failed", e);
        }
    };

    setupCamera().then(runDetection);

    return () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      // Stop tracks
      if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleState = () => {
    setTreeState(prev => prev === TreeState.FORMED ? TreeState.CHAOS : TreeState.FORMED);
  };

  return (
    <div className="w-full h-full bg-black relative font-sans overflow-hidden">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: false, toneMapping: 0 }} 
      >
        <Scene treeState={treeState} gestureState={gestureState} />
      </Canvas>

      <UI 
        onToggleState={toggleState} 
        currentState={treeState}
        gestureState={gestureState}
        videoRef={videoRef}
      />
      
      <Loader 
        containerStyles={{ background: 'black' }} 
        innerStyles={{ width: '200px', height: '2px', background: '#333' }}
        barStyles={{ background: '#fce7f3' }}
        dataStyles={{ color: '#fce7f3', fontFamily: 'serif' }}
      />
    </div>
  );
};

export default App;