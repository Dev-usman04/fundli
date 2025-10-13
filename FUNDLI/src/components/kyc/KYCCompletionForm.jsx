import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  CreditCard, 
  Building2, 
  User, 
  FileText,
  ArrowRight,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { buildApiUrl } from '../../utils/config';

const KYCCompletionForm = ({ onComplete, onCancel, user }) => {
  const [formData, setFormData] = useState({
    bvn: '',
    bankAccount: {
      accountNumber: '',
      bankCode: '',
      accountName: ''
    }
  });
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationResults, setVerificationResults] = useState(null);

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('/kyc/banks'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBanks(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('bankAccount.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bankAccount: {
          ...prev.bankAccount,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.bvn || formData.bvn.length !== 11) {
      setError('Please enter a valid 11-digit BVN');
      return false;
    }

    if (!formData.bankAccount.accountNumber || formData.bankAccount.accountNumber.length !== 10) {
      setError('Please enter a valid 10-digit account number');
      return false;
    }

    if (!formData.bankAccount.bankCode) {
      setError('Please select a bank');
      return false;
    }

    if (!formData.bankAccount.accountName.trim()) {
      setError('Please enter the account name');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('/kyc/complete-verification'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationResults(data.data);
        setSuccess('KYC verification completed successfully!');
        setCurrentStep(2);
        
        if (data.data.kycVerified) {
          setTimeout(() => {
            onComplete && onComplete(data.data);
          }, 3000);
        }
      } else {
        setError(data.message || 'KYC verification failed');
      }
    } catch (error) {
      console.error('KYC verification error:', error);
      setError('Failed to complete KYC verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Complete KYC Verification
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Provide your BVN and bank account details to complete verification
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BVN Section */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CreditCard className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              BVN Verification
            </h3>
          </div>
          
          <div>
            <label htmlFor="bvn" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bank Verification Number (BVN)
            </label>
            <input
              type="text"
              id="bvn"
              name="bvn"
              value={formData.bvn}
              onChange={handleInputChange}
              placeholder="Enter your 11-digit BVN"
              maxLength="11"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your BVN is required for identity verification
            </p>
          </div>
        </div>

        {/* Bank Account Section */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Building2 className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bank Account Verification
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bankCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bank
              </label>
              <select
                id="bankCode"
                name="bankAccount.bankCode"
                value={formData.bankAccount.bankCode}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select your bank</option>
                {banks.map(bank => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Number
              </label>
              <input
                type="text"
                id="accountNumber"
                name="bankAccount.accountNumber"
                value={formData.bankAccount.accountNumber}
                onChange={handleInputChange}
                placeholder="Enter your 10-digit account number"
                maxLength="10"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Account Name
            </label>
            <input
              type="text"
              id="accountName"
              name="bankAccount.accountName"
              value={formData.bankAccount.accountName}
              onChange={handleInputChange}
              placeholder="Enter the name on the account"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This should match the name on your bank account
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center"
          >
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Complete Verification
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        {verificationResults?.kycVerified ? (
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        ) : (
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        )}
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {verificationResults?.kycVerified ? 'Verification Complete!' : 'Verification Pending'}
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400">
          {verificationResults?.kycVerified 
            ? 'Your KYC verification has been completed successfully'
            : 'Your KYC verification is pending review'
          }
        </p>
      </div>

      {/* Verification Results */}
      {verificationResults && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Verification Results
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">BVN Verification</span>
              <span className={`text-sm font-medium ${verificationResults.verificationResults?.bvn?.verified ? 'text-green-600' : 'text-red-600'}`}>
                {verificationResults.verificationResults?.bvn?.verified ? 'Verified' : 'Failed'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Bank Account</span>
              <span className={`text-sm font-medium ${verificationResults.verificationResults?.bankAccount?.verified ? 'text-green-600' : 'text-red-600'}`}>
                {verificationResults.verificationResults?.bankAccount?.verified ? 'Verified' : 'Failed'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Face Verification</span>
              <span className={`text-sm font-medium ${verificationResults.requirements?.faceVerification ? 'text-green-600' : 'text-red-600'}`}>
                {verificationResults.requirements?.faceVerification ? 'Verified' : 'Pending'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Document Upload</span>
              <span className={`text-sm font-medium ${verificationResults.requirements?.documentUpload ? 'text-green-600' : 'text-red-600'}`}>
                {verificationResults.requirements?.documentUpload ? 'Complete' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center"
        >
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-700 dark:text-green-300">{success}</span>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center">
        <button
          onClick={() => onComplete && onComplete(verificationResults)}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
      </div>
    </div>
  );
};

export default KYCCompletionForm;
