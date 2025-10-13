import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

const CameraTest = () => {
  const [stream, setStream] = useState(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cameraInfo, setCameraInfo] = useState(null);
  
  const videoRef = useRef(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const testCamera = async () => {
    try {
      setIsLoading(true);
      setError('');
      setIsVideoReady(false);
      
      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      // Get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available video devices:', videoDevices);
      setCameraInfo({
        deviceCount: videoDevices.length,
        devices: videoDevices.map(d => ({
          label: d.label || 'Unknown Camera',
          deviceId: d.deviceId
        }))
      });

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user',
          frameRate: { ideal: 30, min: 15 }
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        await new Promise((resolve, reject) => {
          let resolved = false;
          
          const cleanup = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('error', onError);
          };
          
          const onLoadedMetadata = () => {
            if (!resolved) {
              resolved = true;
              cleanup();
              setIsVideoReady(true);
              resolve();
            }
          };
          
          const onCanPlay = () => {
            if (!resolved) {
              resolved = true;
              cleanup();
              setIsVideoReady(true);
              resolve();
            }
          };
          
          const onPlaying = () => {
            if (!resolved) {
              resolved = true;
              cleanup();
              setIsVideoReady(true);
              resolve();
            }
          };
          
          const onError = (error) => {
            if (!resolved) {
              resolved = true;
              cleanup();
              reject(error);
            }
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('canplay', onCanPlay);
          video.addEventListener('playing', onPlaying);
          video.addEventListener('error', onError);
          
          video.play().catch(err => {
            console.warn('Video play failed:', err);
          });
          
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              cleanup();
              reject(new Error('Video loading timeout'));
            }
          }, 8000);
        });
      }
      
    } catch (error) {
      console.error('Camera test error:', error);
      
      let errorMessage = 'Camera test failed: ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Camera permission denied. Please allow camera access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please connect a camera.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'Camera constraints not supported.';
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Camera initialization timed out.';
      } else {
        errorMessage += error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsVideoReady(false);
    setCameraInfo(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
            Camera Test
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Test your camera functionality for KYC verification
          </p>
        </div>

        {/* Camera Info */}
        {cameraInfo && (
          <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
            <h3 className="font-medium text-neutral-900 dark:text-white mb-2">
              Camera Information
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Found {cameraInfo.deviceCount} camera(s)
            </p>
            {cameraInfo.devices.map((device, index) => (
              <p key={index} className="text-xs text-neutral-500 dark:text-neutral-500">
                {index + 1}. {device.label}
              </p>
            ))}
          </div>
        )}

        {/* Video Preview */}
        <div className="relative mb-6">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-64 bg-neutral-900 rounded-lg object-cover"
          />
          
          {!isVideoReady && !error && (
            <div className="absolute inset-0 bg-neutral-900 bg-opacity-75 flex items-center justify-center rounded-lg">
              <div className="text-center text-white">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Initializing camera...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 bg-red-900 bg-opacity-75 flex items-center justify-center rounded-lg">
              <div className="text-center text-white">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Camera Error</p>
              </div>
            </div>
          )}
          
          {isVideoReady && !error && (
            <div className="absolute top-2 right-2">
              <div className="flex items-center space-x-1 bg-green-600 text-white px-2 py-1 rounded-full text-xs">
                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 text-error-600 mr-2" />
            <span className="text-error-700 dark:text-error-300 text-sm">{error}</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex space-x-3">
          {!stream ? (
            <button
              onClick={testCamera}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Testing Camera...' : 'Test Camera'}
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
            >
              <Camera className="h-4 w-4 mr-2" />
              Stop Camera
            </button>
          )}
        </div>

        {/* Status */}
        {isVideoReady && (
          <div className="mt-4 p-3 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 text-success-600 mr-2" />
            <span className="text-success-700 dark:text-success-300 text-sm">
              Camera is working correctly! You can proceed with KYC verification.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraTest;

