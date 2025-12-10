import { FilesetResolver, GestureRecognizer, DrawingUtils } from '@mediapipe/tasks-vision';

let gestureRecognizer: GestureRecognizer | null = null;
let runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO';

export const initializeGestureRecognizer = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU"
    },
    runningMode: runningMode
  });
  
  return gestureRecognizer;
};

export const detectGesture = (video: HTMLVideoElement) => {
  if (!gestureRecognizer) return null;
  
  const nowInMs = Date.now();
  const results = gestureRecognizer.recognizeForVideo(video, nowInMs);
  
  return results;
};
