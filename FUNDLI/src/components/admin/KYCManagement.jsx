import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Download, 
  Search, 
  Filter,
  RefreshCw,
  User,
  FileText,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  MoreVertical
} from 'lucide-react';
import { buildApiUrl } from '../../utils/config';

const KYCManagement = () => {
  const [kycApplications, setKycApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchKYCApplications();
  }, []);

  const fetchKYCApplications = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('/admin/kyc-applications'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setKycApplications(data.data || []);
      } else {
        setError('Failed to fetch KYC applications');
      }
    } catch (error) {
      console.error('Error fetching KYC applications:', error);
      setError('Failed to fetch KYC applications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId, newStatus, reason = '') => {
    try {
      setIsProcessing(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl('/admin/kyc-applications/update-status'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          applicationId,
          status: newStatus,
          reason
        })
      });

      if (response.ok) {
        await fetchKYCApplications();
        setShowDetails(false);
        setSelectedApplication(null);
      } else {
        setError('Failed to update KYC status');
      }
    } catch (error) {
      console.error('Error updating KYC status:', error);
      setError('Failed to update KYC status');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filteredApplications = kycApplications.filter(app => {
    const matchesSearch = app.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.kycStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getCompletionPercentage = (application) => {
    let completed = 0;
    let total = 4;

    if (application.documentImage) completed++;
    if (application.liveFaceImage) completed++;
    if (application.kycData?.bvn?.verified) completed++;
    if (application.kycData?.bankAccount?.verified) completed++;

    return Math.round((completed / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KYC Management</h1>
            <p className="text-gray-600 mt-2">Review and manage KYC verification applications</p>
          </div>
          <button
            onClick={fetchKYCApplications}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center"
          >
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </motion.div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{kycApplications.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kycApplications.filter(app => app.kycStatus === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kycApplications.filter(app => app.kycStatus === 'verified').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kycApplications.filter(app => app.kycStatus === 'failed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">KYC Applications</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApplications.map((application) => (
                  <tr key={application._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {application.user?.firstName} {application.user?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {application.user?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(application.kycStatus)}`}>
                        {getStatusIcon(application.kycStatus)}
                        <span className="ml-1 capitalize">{application.kycStatus}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${getCompletionPercentage(application)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {getCompletionPercentage(application)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(application.kycData?.submittedAt || application.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedApplication(application);
                          setShowDetails(true);
                        }}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Application Details Modal */}
        {showDetails && selectedApplication && (
          <ApplicationDetailsModal
            application={selectedApplication}
            onClose={() => {
              setShowDetails(false);
              setSelectedApplication(null);
            }}
            onStatusUpdate={handleStatusUpdate}
            isProcessing={isProcessing}
          />
        )}
      </motion.div>
    </div>
  );
};

const ApplicationDetailsModal = ({ application, onClose, onStatusUpdate, isProcessing }) => {
  const [reason, setReason] = useState('');

  const handleApprove = () => {
    onStatusUpdate(application._id, 'verified');
  };

  const handleReject = () => {
    if (!reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onStatusUpdate(application._id, 'failed', reason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">KYC Application Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* User Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">User Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-sm text-gray-900">
                  {application.user?.firstName} {application.user?.lastName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{application.user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900">{application.user?.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User Type</label>
                <p className="text-sm text-gray-900 capitalize">{application.user?.userType}</p>
              </div>
            </div>
          </div>

          {/* Document Verification */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Document Verification</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Document Type</label>
                <p className="text-sm text-gray-900 capitalize">
                  {application.kycVerificationDetails?.documentType?.replace('_', ' ') || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Document Number</label>
                <p className="text-sm text-gray-900">
                  {application.kycVerificationDetails?.documentNumber || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Document Uploaded</label>
                <p className="text-sm text-gray-900">
                  {application.documentImage ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Live Face Captured</label>
                <p className="text-sm text-gray-900">
                  {application.liveFaceImage ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>

          {/* Face Verification */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Face Verification</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Similarity Score</label>
                <p className="text-sm text-gray-900">
                  {application.verificationScore || 0}%
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Liveness Check</label>
                <p className="text-sm text-gray-900">
                  {application.kycVerificationDetails?.livenessCheckPassed ? 'Passed' : 'Failed'}
                </p>
              </div>
            </div>
          </div>

          {/* BVN Verification */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">BVN Verification</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">BVN Number</label>
                <p className="text-sm text-gray-900">
                  {application.kycData?.bvn?.number ? 
                    application.kycData.bvn.number.substring(0, 3) + '***' + application.kycData.bvn.number.substring(6) : 
                    'Not provided'
                  }
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">BVN Status</label>
                <p className="text-sm text-gray-900">
                  {application.kycData?.bvn?.verified ? 'Verified' : 'Not verified'}
                </p>
              </div>
            </div>
          </div>

          {/* Bank Account Verification */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Bank Account Verification</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Number</label>
                <p className="text-sm text-gray-900">
                  {application.kycData?.bankAccount?.accountNumber ? 
                    application.kycData.bankAccount.accountNumber.substring(0, 3) + '***' + application.kycData.bankAccount.accountNumber.substring(6) : 
                    'Not provided'
                  }
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                <p className="text-sm text-gray-900">
                  {application.kycData?.bankAccount?.bankName || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Name</label>
                <p className="text-sm text-gray-900">
                  {application.kycData?.bankAccount?.accountName || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Status</label>
                <p className="text-sm text-gray-900">
                  {application.kycData?.bankAccount?.verified ? 'Verified' : 'Not verified'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex-1 mr-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (if applicable)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows="3"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default KYCManagement;
