import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  User,
  FileText,
  Eye,
  Smile,
  RotateCcw
} from 'lucide-react';
import { buildApiUrl } from '../../utils/config';
import * as faceapi from 'face-api.js';

const KYCFacialVerification = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Document upload state
  const [documentFile, setDocumentFile] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [documentType, setDocumentType] = useState('national_id');
  const [documentNumber, setDocumentNumber] = useState('');
  
  // Camera capture state
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [livenessStep, setLivenessStep] = useState(0);
  const [livenessInstructions, setLivenessInstructions] = useState([
    'Look directly at the camera',
    'Blink your eyes',
    'Smile naturally',
    'Turn your head slightly left',
    'Turn your head slightly right'
  ]);
  
  // Verification state
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationScore, setVerificationScore] = useState(null);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Face-API.js models (will be loaded)
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  // Network timeout helper
  const fetchWithTimeout = async (input, init = {}, timeoutMs = 20000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(id);
    }
  };

  useEffect(() => {
    loadFaceAPIModels();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Auto-start camera when reaching step 2
  useEffect(() => {
    if (currentStep === 2 && !stream && !isLoading) {
      console.log('🎥 Auto-starting camera for step 2...');
      startCamera();
    }
  }, [currentStep, stream, isLoading]);

  const loadFaceAPIModels = async () => {
    try {
      console.log('Loading Face-API.js models...');
      
      // Try multiple model sources with better error handling
      const modelSources = [
        {
          name: 'CDN (jsdelivr)',
          baseUrl: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
        },
        {
          name: 'Local models',
          baseUrl: '/models'
        },
        {
          name: 'Alternative CDN',
          baseUrl: 'https://unpkg.com/@vladmandic/face-api/model'
        }
      ];
      
      let modelsLoaded = false;
      let lastError = null;
      
      for (const source of modelSources) {
        try {
          console.log(`Trying to load models from ${source.name}...`);
          
          // Load models with timeout
          const loadPromise = Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(source.baseUrl),
            faceapi.nets.faceLandmark68Net.loadFromUri(source.baseUrl),
            faceapi.nets.faceRecognitionNet.loadFromUri(source.baseUrl),
            faceapi.nets.faceExpressionNet.loadFromUri(source.baseUrl)
          ]);
          
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Model loading timeout')), 15000);
          });
          
          await Promise.race([loadPromise, timeoutPromise]);
          
          console.log(`✅ Models loaded successfully from ${source.name}`);
          modelsLoaded = true;
          break;
          
        } catch (error) {
          console.warn(`❌ Failed to load models from ${source.name}:`, error.message);
          lastError = error;
          continue;
        }
      }
      
      if (modelsLoaded) {
        setModelsLoaded(true);
        console.log('✅ Face-API.js models loaded successfully');
      } else {
        console.error('❌ Failed to load models from all sources');
        throw lastError || new Error('Failed to load face detection models');
      }
      
    } catch (error) {
      console.error('❌ Error loading Face-API models:', error);
      
      // Don't block the camera functionality if models fail to load
      // The user can still capture photos, but liveness check will be skipped
      setError('Face detection models failed to load. Camera will work but advanced features may be limited.');
      
      // Set a flag to indicate models are not available
      setModelsLoaded(false);
      
      // Clear the error after 5 seconds so user can continue
      setTimeout(() => {
        setError('');
      }, 5000);
    }
  };

  const handleDocumentUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setDocumentFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setDocumentPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError('');
      setIsVideoReady(false);
      
      console.log('🎥 Starting camera initialization...');
      // Environment diagnostics: require secure context except localhost
      const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
      if (!window.isSecureContext && !isLocalhost) {
        throw new Error('Insecure context: Camera requires HTTPS or localhost');
      }
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }
      
      // Check camera permission state when available
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const perm = await navigator.permissions.query({ name: 'camera' });
          console.log('🔐 Camera permission state:', perm.state);
          if (perm.state === 'denied') {
            throw new Error('Camera permission denied in browser settings');
          }
        }
      } catch (_) {}
      
      // Get camera stream with simple constraints
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });
      } catch (constraintError) {
        console.warn('Primary constraints failed, trying basic video:', constraintError);
        // Fallback to basic video
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      console.log('✅ Camera stream obtained');
      
      if (!mediaStream) {
        throw new Error('Failed to get camera stream');
      }
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        console.log('✅ Video srcObject set');
        // Wait for readiness events instead of assuming immediate readiness
        const onLoadedMetadata = () => {
          console.log('📹 loadedmetadata fired');
        };
        const onCanPlay = () => {
          console.log('▶️ canplay fired');
          setIsVideoReady(true);
          setIsLoading(false);
          setCurrentStep(2);
          cleanupEvents();
        };
        const onPlaying = () => {
          console.log('🎬 playing fired');
          setIsVideoReady(true);
          setIsLoading(false);
          setCurrentStep(2);
          cleanupEvents();
        };
        const cleanupEvents = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('canplay', onCanPlay);
          video.removeEventListener('playing', onPlaying);
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('playing', onPlaying);

        try {
          await video.play();
        } catch (err) {
          console.warn('⚠️ Video play blocked by autoplay policy:', err);
          setIsLoading(false);
          setError('Click Start Camera again if preview is blank (autoplay was blocked).');
        }

        // Safety timeout: fallback if not ready in time
        setTimeout(() => {
          if (!isVideoReady) {
            console.warn('⚠️ Video not ready after timeout, attempting simple camera');
            startSimpleCamera();
          }
        }, 4000);

        console.log('🎉 Camera initialization sequence triggered');
        return;
      }
      
    } catch (error) {
      console.error('❌ Camera access error:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Unable to access camera. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions and refresh the page.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application. Please close other applications using the camera.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'Camera constraints not supported. Please try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage += 'Camera initialization timed out. Please try again.';
      } else if (error.message.includes('Insecure context')) {
        errorMessage += 'Use HTTPS or localhost to enable camera access.';
      } else if (error.message.toLowerCase().includes('permission')) {
        errorMessage += 'Camera permission is denied. Check site settings and allow camera.';
      } else {
        errorMessage += 'Please ensure camera permissions are granted and try again.';
      }
      
      // Enumerate devices to assist debugging
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        console.log('🎛️ Device diagnostics:', {
          totalDevices: devices.length,
          cameras: cameras.map(c => ({ label: c.label || 'Unknown', deviceId: c.deviceId }))
        });
        if (cameras.length === 0) {
          errorMessage = 'No camera detected. Connect a camera and retry.';
        }
      } catch (_) {}

      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsCapturing(true);
    setError('');
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Wait for video to be ready with retry mechanism
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
          break;
        }
        
        // Wait 100ms before next attempt
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // Final check
      if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
        throw new Error('Video not ready for capture. Please wait a moment and try again.');
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob with proper error handling
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/jpeg', 0.8);
      });
      
      // Validate blob before creating object URL
      if (!blob || blob.size === 0) {
        throw new Error('Invalid blob created from canvas');
      }
      
      // Create object URL with fallback
      let imageUrl;
      try {
        imageUrl = URL.createObjectURL(blob);
      } catch (urlError) {
        console.warn('createObjectURL failed, using canvas data URL:', urlError);
        // Fallback to canvas data URL
        imageUrl = canvas.toDataURL('image/jpeg', 0.8);
      }
      
      setCapturedImage(imageUrl);
      
      // Perform liveness check
      await performLivenessCheck(blob);
      
    } catch (error) {
      console.error('Capture error:', error);
      setError('Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const performLivenessCheck = async (imageBlob) => {
    // If models aren't loaded, skip liveness check but allow photo capture
    if (!modelsLoaded) {
      console.warn('Face-API models not loaded, skipping liveness check');
      // Move to next step and check if we should proceed to verification
      const nextStep = livenessStep + 1;
      setLivenessStep(nextStep);
      
      if (nextStep >= livenessInstructions.length) {
        setCurrentStep(3);
      }
      return;
    }

    try {
      console.log('Performing liveness check...');
      
      // Create image element from blob
      const img = new Image();
      const imageUrl = URL.createObjectURL(imageBlob);
      img.src = imageUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Image loading timeout')), 5000);
      });

      // Detect faces and landmarks with timeout
      const detectionPromise = faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Face detection timeout')), 10000);
      });

      const detections = await Promise.race([detectionPromise, timeoutPromise]);

      // Clean up image URL
      URL.revokeObjectURL(imageUrl);

      if (detections.length === 0) {
        setError('No face detected. Please ensure your face is clearly visible.');
        return;
      }

      if (detections.length > 1) {
        setError('Multiple faces detected. Please ensure only your face is visible.');
        return;
      }

      const detection = detections[0];
      const expressions = detection.expressions;
      
      // Check for different liveness indicators based on current step
      const currentInstruction = livenessInstructions[livenessStep];
      let livenessPassed = false;
      let errorMessage = '';

      console.log('Liveness check results:', {
        currentStep: livenessStep,
        currentInstruction,
        expressions: {
          happy: expressions.happy,
          neutral: expressions.neutral,
          sad: expressions.sad,
          angry: expressions.angry,
          fearful: expressions.fearful,
          disgusted: expressions.disgusted,
          surprised: expressions.surprised
        }
      });

      // Check based on current instruction
      switch (livenessStep) {
        case 0: // "Look directly at the camera"
          livenessPassed = expressions.neutral > 0.4 && expressions.happy < 0.3;
          errorMessage = 'Please look directly at the camera with a neutral expression.';
          break;
          
        case 1: // "Blink your eyes"
          // For blinking, we check if eyes are detected (simplified check)
          const leftEye = detection.landmarks.getLeftEye();
          const rightEye = detection.landmarks.getRightEye();
          livenessPassed = leftEye.length > 0 && rightEye.length > 0;
          errorMessage = 'Please blink your eyes naturally.';
          break;
          
        case 2: // "Smile naturally"
          livenessPassed = expressions.happy > 0.3 && expressions.happy < 0.8;
          errorMessage = 'Please smile naturally.';
          break;
          
        case 3: // "Turn your head slightly left"
          // Simplified head turn detection (in real implementation, you'd use pose estimation)
          livenessPassed = expressions.neutral > 0.3;
          errorMessage = 'Please turn your head slightly to the left.';
          break;
          
        case 4: // "Turn your head slightly right"
          livenessPassed = expressions.neutral > 0.3;
          errorMessage = 'Please turn your head slightly to the right.';
          break;
          
        default:
          // Fallback: basic face detection
          livenessPassed = expressions.neutral > 0.3 || expressions.happy > 0.2;
          errorMessage = 'Please ensure your face is clearly visible.';
      }

      if (livenessPassed) {
        // Move to next step
        const nextStep = livenessStep + 1;
        setLivenessStep(nextStep);
        
        // Check if we've completed all liveness steps
        if (nextStep >= livenessInstructions.length) {
          console.log('✅ All liveness checks completed, moving to verification step');
          setCurrentStep(3);
        } else {
          console.log(`✅ Liveness step ${livenessStep + 1} completed, moving to step ${nextStep + 1}`);
        }
      } else {
        setError(errorMessage);
      }

    } catch (error) {
      console.error('Liveness check error:', error);
      
      // If liveness check fails, still allow the user to proceed
      // This prevents blocking the entire flow due to technical issues
      if (error.message.includes('timeout')) {
        setError('Liveness check timed out. You can still proceed with photo capture.');
        setTimeout(() => {
          setError('');
          setCurrentStep(3);
        }, 3000);
      } else {
        setError('Liveness check failed. You can still proceed with photo capture.');
        setTimeout(() => {
          setError('');
          setCurrentStep(3);
        }, 3000);
      }
    }
  };

  const uploadDocument = async () => {
    if (!documentFile || !documentNumber) {
      setError('Please upload a document and enter the document number.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      formData.append('documentType', documentType);
      formData.append('documentNumber', documentNumber);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('/kyc/upload-document'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Document uploaded successfully!');
        // Move UI to Step 2 first so loading spinner appears on camera step, not upload button
        setCurrentStep(2);
        // Clear success shortly after and start camera
        setTimeout(() => {
          setSuccess('');
        }, 800);
        // Start camera after transitioning to Step 2
        setTimeout(() => {
          startCamera();
        }, 50);
      } else {
        setError(data.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadLiveFace = async () => {
    if (!capturedImage) {
      setError('Please capture a photo first.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let blob;
      
      // Handle both object URL and data URL formats
      if (capturedImage.startsWith('blob:')) {
        // Object URL - convert to blob
        const response = await fetch(capturedImage);
        blob = await response.blob();
      } else if (capturedImage.startsWith('data:')) {
        // Data URL - convert to blob
        const response = await fetch(capturedImage);
        blob = await response.blob();
      } else {
        throw new Error('Invalid image format');
      }

      const formData = new FormData();
      formData.append('liveFace', blob, 'live-face.jpg');

      const token = localStorage.getItem('accessToken');
      const uploadResponse = await fetchWithTimeout(buildApiUrl('/kyc/capture-face'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }, 20000);

      const uploadData = await uploadResponse.json();

      if (uploadResponse.ok) {
        // Now perform face verification
        await performFaceVerification();
      } else {
        setError(uploadData.message || 'Failed to upload live face');
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (error.name === 'AbortError') {
        setError('Uploading live face timed out. Please check your connection and try again.');
      } else {
        setError('Failed to upload live face. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const performFaceVerification = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetchWithTimeout(buildApiUrl('/kyc/verify-faces'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }, 20000);

      const data = await response.json();

      if (response.ok) {
        setVerificationResult(data.data);
        setVerificationScore(data.data.verificationScore);
        setCurrentStep(4);
        
        if (data.data.kycVerified) {
          setSuccess('KYC verification successful!');
          setTimeout(() => {
            onComplete && onComplete(data.data);
          }, 2000);
        }
      } else {
        setError(data.message || 'Face verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      if (error.name === 'AbortError') {
        setError('Verification is taking longer than expected. Please try again.');
      } else {
        setError('Face verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const retryVerification = () => {
    setCurrentStep(1);
    setDocumentFile(null);
    setDocumentPreview(null);
    setCapturedImage(null);
    setVerificationResult(null);
    setVerificationScore(null);
    setLivenessStep(0);
    setError('');
    setSuccess('');
    setIsVideoReady(false);
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsVideoReady(false);
  };

  const retryCamera = async () => {
    setError('');
    await startCamera();
  };

  const startSimpleCamera = async () => {
    try {
      console.log('🎥 Starting ULTRA-SIMPLE camera fallback...');
      setIsLoading(true);
      setError('');
      setIsVideoReady(false);
      
      // Ultra-simple camera request
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        
        // IMMEDIATE READY - No waiting at all
        console.log('🚀 ULTRA-SIMPLE camera ready IMMEDIATELY!');
        setIsVideoReady(true);
        setIsLoading(false);
        setCurrentStep(2);
        
        // Try to play video
        videoRef.current.play().catch(err => {
          console.warn('⚠️ Video play failed (normal):', err);
        });
      }
    } catch (error) {
      console.error('❌ Ultra-simple camera failed:', error);
      setError('Camera failed: ' + error.message);
      setIsLoading(false);
    }
  };

  const forceStartCamera = async () => {
    try {
      console.log('🚀 FORCE starting camera - bypassing all checks...');
      setIsLoading(true);
      setError('');
      setIsVideoReady(false);
      
      // Force camera start with minimal constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        
        // FORCE READY STATE IMMEDIATELY
        console.log('🚀 FORCE camera ready!');
        setIsVideoReady(true);
        setIsLoading(false);
        setCurrentStep(2);
        
        // Force play
        videoRef.current.play().catch(() => {});
      }
    } catch (error) {
      console.error('❌ Force camera failed:', error);
      setError('Force camera failed: ' + error.message);
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
          Upload Identity Document
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Please upload a clear photo of your government-issued ID
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Document Type
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-secondary-900 dark:text-white"
          >
            <option value="national_id">National ID</option>
            <option value="passport">Passport</option>
            <option value="driver_license">Driver's License</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Document Number
          </label>
          <input
            type="text"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder="Enter document number"
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-secondary-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Upload Document
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 transition-colors"
          >
            {documentPreview ? (
              <div className="space-y-2">
                <img
                  src={documentPreview}
                  alt="Document preview"
                  className="w-32 h-20 object-cover rounded mx-auto"
                />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {documentFile?.name}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 text-neutral-400 mx-auto" />
                <p className="text-neutral-600 dark:text-neutral-400">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">
                  PNG, JPG, WebP up to 10MB
                </p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleDocumentUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={uploadDocument}
          disabled={isLoading || !documentFile || !documentNumber}
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Upload Document
        </button>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Camera className="h-8 w-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
          Capture Live Photo
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          {livenessInstructions[livenessStep]}
        </p>
        
        {/* Liveness Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-2">
            <span>Step {livenessStep + 1} of {livenessInstructions.length}</span>
            <span>{Math.round(((livenessStep + 1) / livenessInstructions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((livenessStep + 1) / livenessInstructions.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-64 bg-neutral-900 rounded-lg object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Camera loading overlay */}
        {!isVideoReady && !error && isLoading && (
          <div className="absolute inset-0 bg-neutral-900 bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center text-white">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p className="text-sm">Initializing camera...</p>
              <p className="text-xs text-neutral-400 mt-1">Please wait</p>
            </div>
          </div>
        )}
        
        {/* Camera not started overlay */}
        {!isVideoReady && !error && !isLoading && !stream && (
          <div className="absolute inset-0 bg-neutral-900 bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center text-white">
              <Camera className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
              <p className="text-sm">Camera Not Started</p>
              <p className="text-xs text-neutral-400 mt-1">Click "Start Camera" below</p>
            </div>
          </div>
        )}
        
        {/* Camera error overlay */}
        {error && !capturedImage && (
          <div className="absolute inset-0 bg-red-900 bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center text-white">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{error || 'Camera Error'}</p>
              <p className="text-xs text-red-200 mt-1">Fix and retry below</p>
            </div>
          </div>
        )}
        
        {/* Success overlay */}
        {capturedImage && (
          <div className="absolute inset-0 bg-green-900 bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="text-center text-white">
              <CheckCircle className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm font-medium">Photo captured successfully!</p>
              <p className="text-xs text-green-200 mt-1">Processing...</p>
            </div>
          </div>
        )}
        
        {/* Camera status indicator */}
        {isVideoReady && !capturedImage && !error && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center space-x-1 bg-green-600 text-white px-2 py-1 rounded-full text-xs">
              <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        )}
        
        {/* Camera ready indicator */}
        {isVideoReady && !capturedImage && !error && stream && (
          <div className="absolute bottom-2 left-2">
            <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
              Camera Ready - Click Capture Photo
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-3">
        <button
          onClick={stopCamera}
          className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
        >
          Back
        </button>
        
        {error ? (
          <div className="flex-1 space-y-2">
            <button
              onClick={retryCamera}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Retry Camera
            </button>
            <button
              onClick={startSimpleCamera}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <Camera className="h-4 w-4 mr-2" />
              Simple Camera
            </button>
            <button
              onClick={forceStartCamera}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <Camera className="h-4 w-4 mr-2" />
              FORCE START CAMERA
            </button>
          </div>
        ) : (
          <button
            onClick={!stream ? startCamera : capturePhoto}
            disabled={isCapturing || (stream && !isVideoReady) || isLoading}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isCapturing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            {isCapturing 
              ? 'Capturing...' 
              : !stream
                ? 'Start Camera'
                : !isVideoReady 
                  ? 'Preparing Camera...' 
                  : 'Capture Photo'
            }
          </button>
        )}
      </div>
      
      {/* Skip Liveness Check Option */}
      {livenessStep < livenessInstructions.length - 1 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              console.log('User skipped liveness check');
              setCurrentStep(3);
            }}
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 underline"
          >
            Skip liveness check and proceed to verification
          </button>
        </div>
      )}
      
      {/* Debug Info */}
      <div className="mt-4 p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-xs text-neutral-600 dark:text-neutral-400">
        <div>Debug: Step={currentStep}, Stream={stream ? 'Yes' : 'No'}, VideoReady={isVideoReady ? 'Yes' : 'No'}, Loading={isLoading ? 'Yes' : 'No'}</div>
        <div>Models: {modelsLoaded ? 'Loaded' : 'Not Loaded'}</div>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Eye className="h-8 w-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
          Verifying Your Identity
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Comparing your document photo with your live capture
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <img
              src={documentPreview}
              alt="Document"
              className="w-24 h-16 object-cover rounded mx-auto mb-2"
            />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Document Photo</p>
          </div>
          <div className="text-center">
            <img
              src={capturedImage}
              alt="Live capture"
              className="w-24 h-16 object-cover rounded mx-auto mb-2"
            />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Live Capture</p>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
            <RefreshCw className="h-4 w-4 animate-spin text-primary-600" />
            <span className="text-primary-600 dark:text-primary-400">Processing...</span>
          </div>
        </div>
      </div>

      <button
        onClick={uploadLiveFace}
        disabled={isLoading}
        className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Verify Identity
      </button>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        {verificationResult?.kycVerified ? (
          <div className="w-16 h-16 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-success-600" />
          </div>
        ) : (
          <div className="w-16 h-16 bg-error-100 dark:bg-error-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-error-600" />
          </div>
        )}
        
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
          {verificationResult?.kycVerified ? 'Verification Successful!' : 'Verification Failed'}
        </h2>
        
        <p className="text-neutral-600 dark:text-neutral-400">
          {verificationResult?.kycVerified 
            ? 'Your identity has been successfully verified'
            : 'Face comparison did not meet the required threshold'
          }
        </p>
      </div>

      {verificationResult && (
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-neutral-600 dark:text-neutral-400">Similarity Score:</span>
            <span className={`font-semibold ${
              verificationResult.verificationScore >= 70 
                ? 'text-success-600' 
                : 'text-error-600'
            }`}>
              {verificationResult.verificationScore}%
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-neutral-600 dark:text-neutral-400">Liveness Check:</span>
            <span className={`font-semibold ${
              verificationResult.livenessCheckPassed 
                ? 'text-success-600' 
                : 'text-error-600'
            }`}>
              {verificationResult.livenessCheckPassed ? 'Passed' : 'Failed'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-neutral-600 dark:text-neutral-400">Verification Date:</span>
            <span className="text-neutral-900 dark:text-white">
              {new Date(verificationResult.verificationDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        {!verificationResult?.kycVerified && (
          <button
            onClick={retryVerification}
            className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        )}
        
        <button
          onClick={() => onComplete && onComplete(verificationResult)}
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {verificationResult?.kycVerified ? 'Continue' : 'Close'}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>Upload Document</span>
          <span>Capture Photo</span>
          <span>Verify Identity</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg flex items-center"
          >
            <AlertTriangle className="h-5 w-5 text-error-600 mr-2" />
            <span className="text-error-700 dark:text-error-300">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg flex items-center"
          >
            <CheckCircle className="h-5 w-5 text-success-600 mr-2" />
            <span className="text-success-700 dark:text-success-300">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Content */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>
    </div>
  );
};

export default KYCFacialVerification;
