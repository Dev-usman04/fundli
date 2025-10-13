import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, XCircle, AlertTriangle, User, FileText, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { buildApiUrl } from '../../utils/config';
import KYCFacialVerification from '../../components/kyc/KYCFacialVerification';
import CameraTest from '../../components/kyc/CameraTest';

const KYCPage = () => {
  const { user, updateUser } = useAuth();
  const [kycStatus, setKycStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFacialVerification, setShowFacialVerification] = useState(false);
  const [showCameraTest, setShowCameraTest] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('/kyc/status'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setKycStatus(data.data);
      } else {
        setError('Failed to fetch KYC status');
      }
    } catch (error) {
      console.error('Error fetching KYC status:', error);
      setError('Failed to fetch KYC status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationComplete = (result) => {
    setKycStatus(result);
    setShowFacialVerification(false);
    
    // Update user context
    if (result.kycVerified) {
      updateUser({ ...user, kycVerified: true, kycStatus: 'verified' });
    }
  };

  const handleStartVerification = () => {
    setShowFacialVerification(true);
  };

  const handleCancelVerification = () => {
    setShowFacialVerification(false);
  };

  const handleStartCameraTest = () => {
    setShowCameraTest(true);
  };

  const handleCancelCameraTest = () => {
    setShowCameraTest(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-6 w-6 text-success-600" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-error-600" />;
      case 'pending':
        return <AlertTriangle className="h-6 w-6 text-warning-600" />;
      default:
        return <Shield className="h-6 w-6 text-neutral-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800';
      case 'failed':
        return 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800';
      case 'pending':
        return 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800';
      default:
        return 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Not Started';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (showFacialVerification) {
    return (
      <KYCFacialVerification
        onComplete={handleVerificationComplete}
        onCancel={handleCancelVerification}
      />
    );
  }

  if (showCameraTest) {
    return (
      <div>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={handleCancelCameraTest}
            className="mb-4 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            ← Back to KYC
          </button>
        </div>
        <CameraTest />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
            KYC Verification
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Verify your identity to access all platform features
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg flex items-center"
          >
            <AlertTriangle className="h-5 w-5 text-error-600 mr-2" />
            <span className="text-error-700 dark:text-error-300">{error}</span>
          </motion.div>
        )}

        {/* KYC Status Card */}
        <div className={`rounded-lg border p-6 ${getStatusColor(kycStatus?.kycStatus || 'pending')}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(kycStatus?.kycStatus || 'pending')}
              <div>
                <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">
                  Identity Verification Status
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {getStatusText(kycStatus?.kycStatus || 'pending')}
                </p>
              </div>
            </div>
            <div className="text-right">
              {kycStatus?.verificationScore && (
                <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {kycStatus.verificationScore}%
                </div>
              )}
            </div>
          </div>

          {kycStatus?.kycStatus === 'verified' && (
            <div className="space-y-3">
              <div className="flex items-center text-success-600 dark:text-success-400">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Your identity has been successfully verified</span>
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Verified on {new Date(kycStatus.verificationDetails?.verificationDate).toLocaleDateString()}
              </div>
            </div>
          )}

          {kycStatus?.kycStatus === 'failed' && (
            <div className="space-y-3">
              <div className="flex items-center text-error-600 dark:text-error-400">
                <XCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Identity verification failed</span>
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Similarity score: {kycStatus.verificationScore}% (minimum required: 70%)
              </div>
            </div>
          )}

          {kycStatus?.kycStatus === 'pending' && (
            <div className="space-y-3">
              <div className="flex items-center text-warning-600 dark:text-warning-400">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <span className="font-medium">Identity verification pending</span>
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Complete the verification process to access all features
              </div>
            </div>
          )}
        </div>

        {/* Verification Details */}
        {kycStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Document Information */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
              <div className="flex items-center mb-4">
                <FileText className="h-5 w-5 text-primary-600 mr-2" />
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                  Document Information
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Document Type:</span>
                  <span className="text-secondary-900 dark:text-white capitalize">
                    {kycStatus.verificationDetails?.documentType?.replace('_', ' ') || 'Not provided'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Document Number:</span>
                  <span className="text-secondary-900 dark:text-white">
                    {kycStatus.verificationDetails?.documentNumber || 'Not provided'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Document Uploaded:</span>
                  <span className="text-secondary-900 dark:text-white">
                    {kycStatus.documentImage ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Details */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
              <div className="flex items-center mb-4">
                <User className="h-5 w-5 text-primary-600 mr-2" />
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                  Verification Details
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Similarity Score:</span>
                  <span className={`font-semibold ${
                    kycStatus.verificationScore >= 70 
                      ? 'text-success-600' 
                      : 'text-error-600'
                  }`}>
                    {kycStatus.verificationScore || 0}%
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Liveness Check:</span>
                  <span className={`font-semibold ${
                    kycStatus.verificationDetails?.livenessCheckPassed 
                      ? 'text-success-600' 
                      : 'text-error-600'
                  }`}>
                    {kycStatus.verificationDetails?.livenessCheckPassed ? 'Passed' : 'Failed'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Live Face Captured:</span>
                  <span className="text-secondary-900 dark:text-white">
                    {kycStatus.liveFaceImage ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          {kycStatus?.kycStatus !== 'verified' && (
            <>
              <button
                onClick={handleStartVerification}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
              >
                <Shield className="h-5 w-5 mr-2" />
                {kycStatus?.kycStatus === 'failed' ? 'Retry Verification' : 'Start Verification'}
              </button>
              
              <button
                onClick={handleStartCameraTest}
                className="px-6 py-3 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center"
              >
                <Camera className="h-5 w-5 mr-2" />
                Test Camera
              </button>
            </>
          )}
          
          {kycStatus?.kycStatus === 'verified' && (
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-300 rounded-lg">
                <CheckCircle className="h-5 w-5 mr-2" />
                Verification Complete
              </div>
            </div>
          )}
        </div>

        {/* Information Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3">
            About KYC Verification
          </h3>
          <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <p>• Upload a clear photo of your government-issued ID (passport, national ID, or driver's license)</p>
            <p>• Capture a live selfie using your device camera</p>
            <p>• Our AI system will compare your document photo with your live capture</p>
            <p>• A similarity score of 70% or higher is required for verification</p>
            <p>• Your data is encrypted and stored securely</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default KYCPage;
