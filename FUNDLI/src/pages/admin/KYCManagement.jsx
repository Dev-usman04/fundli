import { useState, useEffect } from 'react';
import { buildApiUrl } from '../../utils/config';
import { motion } from 'framer-motion';
import { Shield, Search, Filter, Eye, CheckCircle, XCircle, Clock, FileText, AlertCircle, User, Mail, Phone, MapPin, Calendar, CreditCard, BarChart3, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const KYCManagement = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingKYC, setPendingKYC] = useState([]);
  const [approvedKYC, setApprovedKYC] = useState([]);
  const [allKYC, setAllKYC] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(null);
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const { user, refreshUserData, updateKYCStatus } = useAuth();

  // KYC Statistics
  const [kycStats, setKycStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  // Calculate KYC statistics
  const calculateKYCStats = () => {
    try {
      // Ensure we have arrays to work with
      const pending = Array.isArray(pendingKYC) ? pendingKYC : [];
      const approved = Array.isArray(approvedKYC) ? approvedKYC : [];
      const all = Array.isArray(allKYC) ? allKYC : [];
      
      // Count by status from all KYC data (this is the source of truth)
      const pendingCount = all.filter(s => (s.kycStatus === 'pending' || s.kycStatus === 'in_review')).length;
      const approvedCount = all.filter(s => (s.kycStatus === 'approved' || s.kycStatus === 'verified')).length;
      const rejectedCount = all.filter(s => (s.kycStatus === 'rejected' || s.kycStatus === 'failed')).length;
      const total = all.length;
      
      // Update statistics
      setKycStats({
        total,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      });
    } catch (error) {
      console.error('Error calculating KYC stats:', error);
      // Set default values on error
      setKycStats({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      });
    }
  };

  // Filter KYC submissions based on search and status
  const filteredKYC = pendingKYC.filter(kyc => {
    if (!kyc.firstName || !kyc.lastName || !kyc.email) return false;
    
    const matchesSearch = `${kyc.firstName} ${kyc.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kyc.email.toLowerCase().includes(searchTerm.toLowerCase());
    // For pending tab, only show items with 'pending' status
    const matchesStatus = kyc.kycStatus === 'pending';
    return matchesSearch && matchesStatus;
  });

  // Filter approved KYC based on search
  const filteredApprovedKYC = approvedKYC.filter(kyc => {
    if (!kyc.firstName || !kyc.lastName || !kyc.email) return false;
    
    const matchesSearch = `${kyc.firstName} ${kyc.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kyc.email.toLowerCase().includes(searchTerm.toLowerCase());
    // For approved tab, only show items with 'approved' status
    const matchesStatus = (kyc.kycStatus === 'approved' || kyc.kycStatus === 'verified');
    return matchesSearch && matchesStatus;
  });

  // Filter all KYC based on search and status
  const filteredAllKYC = allKYC.filter(kyc => {
    if (!kyc.firstName || !kyc.lastName || !kyc.email) return false;
    
    const matchesSearch = `${kyc.firstName} ${kyc.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kyc.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (kyc.kycStatus === statusFilter);
    return matchesSearch && matchesStatus;
  });

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'pending':
        return filteredKYC;
      case 'approved':
        return filteredApprovedKYC;
      case 'all':
        return filteredAllKYC;
      default:
        return filteredKYC;
    }
  };

  // Get current total count
  const getCurrentTotal = () => {
    switch (activeTab) {
      case 'pending':
        return pendingKYC.length;
      case 'approved':
        return approvedKYC.length;
      case 'all':
        return totalItems;
      default:
        return pendingKYC.length;
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Load all three types of KYC data simultaneously
        const [pendingResult, approvedResult, allResult] = await Promise.allSettled([
          loadPendingKYC(),
          loadApprovedKYC(),
          loadAllKYC()
        ]);
        
        // Handle results and update state accordingly
        if (pendingResult.status === 'fulfilled') {
          // Pending KYC loaded successfully
        } else {
          console.error('Failed to load pending KYC:', pendingResult.reason);
        }
        
        if (approvedResult.status === 'fulfilled') {
          // Approved KYC loaded successfully
        } else {
          console.error('Failed to load approved KYC:', approvedResult.reason);
        }
        
        if (allResult.status === 'fulfilled') {
          // All KYC loaded successfully
        } else {
          console.error('Failed to load all KYC:', allResult.reason);
        }
        
        // Calculate KYC statistics after all data is loaded
        calculateKYCStats();
        
      } catch (error) {
        console.error('Error loading initial data:', error);
        setError(`Failed to load initial data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []);

  const loadApprovedKYC = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl('/admin/kyc/approved'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        // Filter to ensure only approved/verified status items are included
        const approvedOnly = (result.data || []).filter(item => (item.kycStatus === 'approved' || item.kycStatus === 'verified'));
        
        setApprovedKYC(approvedOnly);
        
        // Calculate statistics after loading data
        setTimeout(() => calculateKYCStats(), 100);
        return result;
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch approved KYC:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch approved KYC`);
      }
    } catch (error) {
      console.error('Error loading approved KYC:', error);
      setError(`Failed to load approved KYC: ${error.message}`);
      
      // If it's a network error, don't retry immediately
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_FAILED')) {
        // Network error detected, will retry on next manual refresh
      }
      throw error; // Re-throw to be caught by Promise.allSettled
    }
  };

  const loadAllKYC = async (page = 1, status = 'all', search = '') => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        status: status === 'all' ? '' : status,
        search: search || ''
      });

      const url = buildApiUrl(`/admin/kyc/all?${params.toString()}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAllKYC(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalItems(result.pagination.totalItems);
        setCurrentPage(result.pagination.currentPage);
        
        // Calculate statistics after loading data
        setTimeout(() => calculateKYCStats(), 100);
        return result;
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch all KYC:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch all KYC`);
      }
    } catch (error) {
      console.error('Error loading all KYC:', error);
      setError(`Failed to load all KYC: ${error.message}`);
      
      // If it's a network error, don't retry immediately
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_FAILED')) {
        // Network error detected, will retry on next manual refresh
      }
      throw error; // Re-throw to be caught by Promise.allSettled
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'pending') {
      // Pending KYC is already loaded in the initial useEffect
      // Just recalculate statistics to ensure they're up to date
      calculateKYCStats();
    } else if (activeTab === 'approved') {
      // Approved KYC is already loaded, just recalculate stats
      calculateKYCStats();
    } else if (activeTab === 'all') {
      // All KYC is already loaded, just recalculate stats
      calculateKYCStats();
    }
  }, [activeTab]);

  // Auto-refresh data every 30 seconds to keep it up-to-date
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if we're not currently loading and there are no errors
      if (!isLoading && !error) {
        if (activeTab === 'pending') {
          loadPendingKYC();
        } else if (activeTab === 'approved') {
          loadApprovedKYC();
        } else if (activeTab === 'all') {
          loadAllKYC(currentPage, statusFilter, searchTerm);
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [activeTab, currentPage, statusFilter, searchTerm, isLoading, error]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'badge-success';
      case 'pending':
        return 'badge-warning';
      case 'rejected':
        return 'badge-error';
      default:
        return 'badge-info';
    }
  };

  const handleApproveKYC = async (userId, notes = '') => {
    try {
      setIsProcessing(userId);
      console.log('Approving KYC for user:', userId);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl(`/admin/kyc/${userId}/approve`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes })
      });

      console.log('Approval response status:', response.status);
      const result = await response.json();
      console.log('Approval result:', result);

      if (response.ok) {
        const userName = selectedKYC ? `${selectedKYC.firstName} ${selectedKYC.lastName}` : `user ${userId}`;
        setSuccess(`KYC approved successfully for ${userName}! The user can now access all platform features.`);
        
        // Remove the approved KYC from the pending list
        setPendingKYC(prev => prev.filter(kyc => kyc._id !== userId));
        
        // Refresh KYC data for the specific user
        await refreshKYCDataForUser(userId);
        
        // Refresh user data to update KYC status in context
        await refreshUserDataForKYC(userId);
        
        setTimeout(() => setSuccess(''), 5000);
      } else {
        throw new Error(result.message || 'Failed to approve KYC');
      }
    } catch (error) {
      console.error('Error approving KYC:', error);
      setError(`Failed to approve KYC: ${error.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectKYC = async (userId, reason) => {
    try {
      setIsProcessing(userId);
      console.log('Rejecting KYC for user:', userId, 'Reason:', reason);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl(`/admin/kyc/${userId}/reject`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      console.log('Rejection response status:', response.status);
      const result = await response.json();
      console.log('Rejection result:', result);

      if (response.ok) {
        const userName = selectedKYC ? `${selectedKYC.firstName} ${selectedKYC.lastName}` : `user ${userId}`;
        setSuccess(`KYC rejected for ${userName}. The user will need to resubmit their KYC documents.`);
        
        // Remove the rejected KYC from the pending list
        setPendingKYC(prev => prev.filter(kyc => kyc._id !== userId));
        
        // Refresh KYC data for the specific user
        await refreshKYCDataForUser(userId);
        
        // Refresh user data to update KYC status in context
        await refreshUserDataForKYC(userId);
        
        setTimeout(() => setSuccess(''), 5000);
      } else {
        throw new Error(result.message || 'Failed to reject KYC');
      }
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      setError(`Failed to reject KYC: ${error.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsProcessing(null);
    }
  };

  // Format date helper function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Test image loading
  const testImageLoad = (url, imageType) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ success: true, url });
      img.onerror = () => {
        console.error(`Failed to load ${imageType} image:`, url);
        resolve({ success: false, url, error: 'Failed to load image' });
      };
      img.src = url;
    });
  };

  // View KYC details
  const viewKYCDetails = async (kyc) => {
    try {
      setIsLoadingDetails(true);
      console.log('Fetching detailed KYC for user:', kyc._id);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl(`/admin/kyc/${kyc._id}/details`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Detailed KYC data received:', result.data);
        console.log('KYC Documents:', result.data.kycDocuments);
        console.log('Documents object:', result.data.kycDocuments?.documents);
        setSelectedKYC(result.data);
        setShowDetailsModal(true);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch KYC details:', errorData);
        setError(`Failed to fetch KYC details: ${errorData.message}`);
        // Fallback to using the basic data
        setSelectedKYC(kyc);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching KYC details:', error);
      setError(`Failed to fetch KYC details: ${error.message}`);
      // Fallback to using the basic data
      setSelectedKYC(kyc);
      setShowDetailsModal(true);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Close details modal
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedKYC(null);
  };

  // Refresh user data in localStorage and context
  const refreshUserDataForKYC = async (userId) => {
    try {
      // Use the AuthContext refreshUserData function
      await refreshUserData();
      
      // Also update the KYC status in the context
      // This ensures immediate UI updates
      const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (updatedUser.kycStatus) {
        updateKYCStatus(updatedUser.kycStatus);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Refresh KYC data for a specific user
  const refreshKYCDataForUser = async (userId) => {
    try {
      // Refresh all KYC data to reflect the status change
      if (activeTab === 'pending') {
        await loadPendingKYC();
      } else if (activeTab === 'approved') {
        await loadApprovedKYC();
      } else if (activeTab === 'all') {
        await loadAllKYC(currentPage, statusFilter, searchTerm);
      }
      
      // Recalculate statistics after refreshing data
      setTimeout(() => calculateKYCStats(), 200);
    } catch (error) {
      console.error('Error refreshing KYC data:', error);
    }
  };

  const loadPendingKYC = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl('/admin/kyc/pending'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Pending KYC response:', result);
        console.log('Raw pending KYC data:', result.data);
        
        // Log each item's KYC documents
        if (result.data && result.data.length > 0) {
          result.data.forEach((item, index) => {
            console.log(`Item ${index} KYC data:`, {
              name: `${item.firstName} ${item.lastName}`,
              hasKycDocuments: !!item.kycDocuments,
              kycDocumentsKeys: item.kycDocuments ? Object.keys(item.kycDocuments) : 'None',
              hasDocuments: !!item.kycDocuments?.documents,
              documentsKeys: item.kycDocuments?.documents ? Object.keys(item.kycDocuments.documents) : 'None'
            });
          });
        }
        
        // Filter to ensure only pending status items are included
        const pendingOnly = (result.data || []).filter(item => item.kycStatus === 'pending');
        console.log('Filtered pending KYC:', pendingOnly);
        console.log('Filtered count:', pendingOnly.length);
        
        setPendingKYC(pendingOnly);
        
        // Calculate statistics after loading data
        setTimeout(() => calculateKYCStats(), 100);
        return result;
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch pending KYC:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch pending KYC`);
      }
    } catch (error) {
      console.error('Error loading pending KYC:', error);
      setError(`Failed to load pending KYC: ${error.message}`);
      
      // If it's a network error, don't retry immediately
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_FAILED')) {
        // Network error detected, will retry on next manual refresh
      }
      throw error; // Re-throw to be caught by Promise.allSettled
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-2">
          KYC Management
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Review and manage Know Your Customer verification submissions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Submissions</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                {isLoading ? (
                  <div className="animate-pulse bg-neutral-300 dark:bg-neutral-600 h-8 w-16 rounded"></div>
                ) : (
                  kycStats.total
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Pending Review</p>
              <p className="text-2xl font-bold text-warning">
                {isLoading ? (
                  <div className="animate-pulse bg-neutral-300 dark:bg-neutral-600 h-8 w-16 rounded"></div>
                ) : (
                  kycStats.pending
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-warning-600 dark:text-warning-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Approved</p>
              <p className="text-2xl font-bold text-success">
                {isLoading ? (
                  <div className="animate-pulse bg-neutral-300 dark:bg-neutral-600 h-8 w-16 rounded"></div>
                ) : (
                  kycStats.approved
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Rejected</p>
              <p className="text-2xl font-bold text-error">
                {isLoading ? (
                  <div className="animate-pulse bg-neutral-300 dark:bg-neutral-600 h-8 w-16 rounded"></div>
                ) : (
                  kycStats.rejected
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-error-100 dark:bg-error-900 rounded-lg flex items-center justify-center">
              <XCircle className="h-6 w-6 text-error-600 dark:text-error-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Statistics Summary */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 rounded-lg flex items-center justify-center mr-3">
                  <Users className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-400">Active Users</p>
                  <p className="text-lg font-semibold text-primary-900 dark:text-primary-100">
                    {kycStats.approved + kycStats.pending}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-success/10 dark:bg-success/20 border border-success/30 dark:border-success rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-success/20 dark:bg-success rounded-lg flex items-center justify-center mr-3">
                  <CheckCircle className="h-4 w-4 text-success dark:text-success/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-success dark:text-success/50">Verification Rate</p>
                  <p className="text-lg font-semibold text-success dark:text-success/20">
                    {kycStats.total > 0 ? Math.round((kycStats.approved / kycStats.total) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-800 rounded-lg flex items-center justify-center mr-3">
                  <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Pending Rate</p>
                  <p className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                    {kycStats.total > 0 ? Math.round((kycStats.pending / kycStats.total) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
          
        </motion.div>
      )}

      {/* No KYC Data Message */}
      {!isLoading && kycStats.total === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 bg-neutral-50 dark:bg-secondary-800 border border-neutral-200 dark:border-secondary-700 rounded-lg p-8 text-center"
        >
          <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
            No KYC Submissions Yet
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Users need to complete their KYC verification before they can access platform features.
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-primary-500 rounded-full mr-2"></div>
              <span>Users register and submit KYC documents</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              <span>Admin reviews and approves/rejects</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
              <span>Approved users can access platform</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search and Filter Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="card p-6 mb-8"
      >
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-secondary-700">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-secondary-800 dark:text-white"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-neutral-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  if (activeTab === 'all') {
                    loadAllKYC(1, e.target.value, searchTerm);
                  }
                }}
                className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-secondary-800 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={async () => {
                try {
                  setIsLoading(true);
                  setError('');
                  
                  // Refresh all data for the current tab
                  if (activeTab === 'pending') {
                    await loadPendingKYC();
                  } else if (activeTab === 'approved') {
                    await loadApprovedKYC();
                  } else if (activeTab === 'all') {
                    await loadAllKYC(1, statusFilter, searchTerm);
                  }
                  
                  // Also refresh statistics
                  calculateKYCStats();
                } catch (error) {
                  console.error('Error refreshing data:', error);
                  setError(`Failed to refresh data: ${error.message}`);
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 inline mr-2 border-b-2 border-white"></div>
                  Refreshing...
                </>
              ) : (
                'Refresh'
              )}
            </button>

            {/* Refresh Statistics Button */}
            <button
              onClick={() => {
                calculateKYCStats();
              }}
              className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              title="Refresh KYC Statistics"
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              Stats
            </button>
          </div>
        </div>
      </motion.div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 bg-success/10 border border-success/20 text-success px-6 py-4 rounded-lg flex items-center justify-between"
        >
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 mr-3 text-success" />
            <div>
              <p className="font-semibold text-success">{success}</p>
              <p className="text-sm text-success/80 mt-1">
                The KYC status has been updated successfully.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSuccess('')}
            className="text-success/60 hover:text-success/80"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 bg-error/10 border border-error/20 text-error px-6 py-4 rounded-lg flex items-center justify-between"
        >
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 mr-3 text-error" />
            <div>
              <p className="font-semibold text-error">{error}</p>
              <p className="text-sm text-error/80 mt-1">
                Please try again or contact support if the issue persists.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setError('');
                if (activeTab === 'pending') {
                  loadPendingKYC();
                } else if (activeTab === 'approved') {
                  loadApprovedKYC();
                } else if (activeTab === 'all') {
                  loadAllKYC(currentPage, statusFilter, searchTerm);
                }
              }}
              className="px-3 py-1 bg-error text-white text-sm rounded hover:bg-error/80 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => setError('')}
              className="text-error/60 hover:text-error/80"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* KYC Submissions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-secondary-700">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
            KYC Management
          </h3>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-secondary-700">
          <div className="flex space-x-1 bg-neutral-100 dark:bg-secondary-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'pending'
                  ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-secondary-900 dark:hover:text-white'
              }`}
            >
              Pending ({kycStats.pending})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'approved'
                  ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-secondary-900 dark:hover:text-white'
              }`}
            >
              Approved ({kycStats.approved})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-secondary-900 dark:hover:text-white'
              }`}
            >
              All KYC ({kycStats.total})
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-secondary-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  User Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-secondary-900 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-neutral-500 dark:text-neutral-400">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>
                      Loading KYC applications...
                    </div>
                  </td>
                </tr>
              ) : getCurrentData().length > 0 ? (
                getCurrentData().map((submission) => (
                  <motion.tr
                    key={submission._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="hover:bg-neutral-50 dark:hover:bg-secondary-800"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-secondary-900 dark:text-white">
                          {submission.firstName} {submission.lastName}
                        </div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400">
                          {submission.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                      {submission.userType || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getStatusColor(submission.kycStatus || 'pending')}`}>
                        {activeTab === 'pending' ? 'Pending' : (submission.kycStatus || 'Pending')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                      {submission.kycDocuments ? 'Documents Submitted' : 'No Documents'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                      {formatDate(submission.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {activeTab === 'pending' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => viewKYCDetails(submission)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleApproveKYC(submission._id)}
                            className="text-success-600 dark:text-success-400 hover:text-success-700 dark:hover:text-success-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isProcessing === submission._id}
                            title="Approve KYC"
                          >
                            {isProcessing === submission._id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-success-600"></div>
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRejectKYC(submission._id, 'Rejected by Admin')}
                            className="text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isProcessing === submission._id}
                            title="Reject KYC"
                          >
                            {isProcessing === submission._id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-error-600"></div>
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => viewKYCDetails(submission)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <div className="text-neutral-400 dark:text-neutral-500">
                            {activeTab === 'approved' ? 'Approved' : submission.kycStatus}
                          </div>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-neutral-500 dark:text-neutral-400">
                    {isLoading ? 'Loading...' : `No ${activeTab} KYC applications found`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination for All KYC tab */}
        {activeTab === 'all' && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-neutral-200 dark:border-secondary-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                Showing page {currentPage} of {totalPages} ({totalItems} total items)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => loadAllKYC(currentPage - 1, statusFilter, searchTerm)}
                  disabled={currentPage <= 1}
                  className="px-3 py-2 text-sm font-medium text-neutral-500 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-secondary-800 dark:border-neutral-600 dark:text-neutral-400 dark:hover:bg-neutral-700"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadAllKYC(currentPage + 1, statusFilter, searchTerm)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-2 text-sm font-medium text-neutral-500 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-secondary-800 dark:border-neutral-600 dark:text-neutral-400 dark:hover:bg-neutral-700"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* KYC Details Modal */}
      {showDetailsModal && selectedKYC && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-secondary-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-secondary-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                KYC Details - {selectedKYC.firstName} {selectedKYC.lastName}
                {isLoadingDetails && (
                  <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">
                    (Loading...)
                  </span>
                )}
              </h3>
              <button
                onClick={closeDetailsModal}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mr-4"></div>
                  <p className="text-neutral-600 dark:text-neutral-400">Loading KYC details...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h4 className="text-md font-semibold text-secondary-900 dark:text-white flex items-center">
                        <User className="h-5 w-5 mr-2 text-primary-600" />
                        Personal Information
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-24">Name:</span>
                          <span className="text-sm text-secondary-900 dark:text-white">
                            {selectedKYC.firstName} {selectedKYC.lastName}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <Mail className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-24">Email:</span>
                          <span className="text-sm text-secondary-900 dark:text-white">{selectedKYC.email}</span>
                        </div>
                        
                        {selectedKYC.phone && (
                          <div className="flex items-center space-x-3">
                            <Phone className="h-4 w-4 text-neutral-400" />
                            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-24">Phone:</span>
                            <span className="text-sm text-secondary-900 dark:text-white">{selectedKYC.phone}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-3">
                          <CreditCard className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-24">User Type:</span>
                          <span className="text-sm text-secondary-900 dark:text-white capitalize">{selectedKYC.userType}</span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-24">Joined:</span>
                          <span className="text-sm text-secondary-900 dark:text-white">
                            {formatDate(selectedKYC.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KYC Status */}
                    <div className="space-y-4">
                      <h4 className="text-md font-semibold text-secondary-900 dark:text-white flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-primary-600" />
                        KYC Status
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-24">Status:</span>
                          <span className={`badge ${getStatusColor(selectedKYC.kycStatus || 'pending')}`}>
                            {selectedKYC.kycStatus || 'Pending'}
                          </span>
                        </div>
                        
                        {selectedKYC.kycDocuments?.submittedAt && (
                          <div className="flex items-center space-x-3">
                            <Calendar className="h-4 w-4 text-neutral-400" />
                            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-24">Submitted:</span>
                            <span className="text-sm text-secondary-900 dark:text-white">
                              {formatDate(selectedKYC.kycDocuments.submittedAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* KYC Documents Section */}
                  {selectedKYC.kycDocuments && (
                    <div className="mt-8 space-y-4">
                      <h4 className="text-md font-semibold text-secondary-900 dark:text-white flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-primary-600" />
                        KYC Documents
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Identity Information */}
                        <div className="space-y-3">
                          <h5 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Identity Information</h5>
                          
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-24">ID Type:</span>
                              <span className="text-sm text-secondary-900 dark:text-white capitalize">
                                {selectedKYC.kycDocuments.idType || 'N/A'}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-24">ID Number:</span>
                              <span className="text-sm text-secondary-900 dark:text-white">
                                {selectedKYC.kycDocuments.idNumber || 'N/A'}
                              </span>
                            </div>
                            
                            {selectedKYC.kycDocuments.dateOfBirth && (
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-24">Date of Birth:</span>
                                <span className="text-sm text-secondary-900 dark:text-white">
                                  {formatDate(selectedKYC.kycDocuments.dateOfBirth)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Address Information */}
                        {selectedKYC.kycDocuments.address && (
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Address Information</h5>
                            
                            <div className="space-y-2">
                              {selectedKYC.kycDocuments.address.street && (
                                <div className="flex items-center space-x-3">
                                  <MapPin className="h-4 w-4 text-neutral-400" />
                                  <span className="text-sm text-secondary-900 dark:text-white">
                                    {selectedKYC.kycDocuments.address.street}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-16">City:</span>
                                <span className="text-sm text-secondary-900 dark:text-white">
                                  {selectedKYC.kycDocuments.address.city || 'N/A'}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-16">State:</span>
                                <span className="text-sm text-secondary-900 dark:text-white">
                                  {selectedKYC.kycDocuments.address.state || 'N/A'}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-16">Country:</span>
                                <span className="text-sm text-secondary-900 dark:text-white">
                                  {selectedKYC.kycDocuments.address.country || 'N/A'}
                                </span>
                              </div>
                              
                              {selectedKYC.kycDocuments.address.postalCode && (
                                <div className="flex items-center space-x-3">
                                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-16">Postal Code:</span>
                                  <span className="text-sm text-secondary-900 dark:text-white">
                                    {selectedKYC.kycDocuments.address.postalCode}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Document Images */}
                      {selectedKYC.kycDocuments && (
                        <div className="mt-6 space-y-4">
                          <h5 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Document Images</h5>
                          
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {selectedKYC.kycDocuments.documents?.idFront?.url && (
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">ID Front</label>
                                <img
                                  src={selectedKYC.kycDocuments.documents.idFront.url}
                                  alt="ID Front"
                                  className="w-full h-32 object-cover rounded-lg border border-neutral-200 dark:border-secondary-700"
                                  onError={(e) => {
                                    console.error('Failed to load ID Front image:', e.target.src);
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            
                            {selectedKYC.kycDocuments.documents?.idBack?.url && (
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">ID Back</label>
                                <img
                                  src={selectedKYC.kycDocuments.documents.idBack.url}
                                  alt="ID Back"
                                  className="w-full h-32 object-cover rounded-lg border border-neutral-200 dark:border-secondary-700"
                                  onError={(e) => {
                                    console.error('Failed to load ID Back image:', e.target.src);
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            
                            {selectedKYC.kycDocuments.documents?.selfie?.url && (
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Selfie</label>
                                <img
                                  src={selectedKYC.kycDocuments.documents.selfie.url}
                                  alt="Selfie"
                                  className="w-full h-32 object-cover rounded-lg border border-neutral-200 dark:border-secondary-700"
                                  onError={(e) => {
                                    console.error('Failed to load Selfie image:', e.target.src);
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            
                            {selectedKYC.kycDocuments.documents?.proofOfAddress?.url && (
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Proof of Address</label>
                                <img
                                  src={selectedKYC.kycDocuments.documents.proofOfAddress.url}
                                  alt="Proof of Address"
                                  className="w-full h-32 object-cover rounded-lg border border-neutral-200 dark:border-secondary-700"
                                  onError={(e) => {
                                    console.error('Failed to load Proof of Address image:', e.target.src);
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          
                          {/* Show message if no documents */}
                          {(!selectedKYC.kycDocuments.documents || 
                            (!selectedKYC.kycDocuments.documents.idFront?.url && 
                             !selectedKYC.kycDocuments.documents.idBack?.url && 
                             !selectedKYC.kycDocuments.documents.selfie?.url && 
                             !selectedKYC.kycDocuments.documents.proofOfAddress?.url)) && (
                              <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                                <FileText className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                                <p>No document images uploaded yet</p>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons for Pending KYC */}
                  {activeTab === 'pending' && selectedKYC.kycStatus === 'pending' && (
                    <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-secondary-700 flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          closeDetailsModal();
                          handleRejectKYC(selectedKYC._id, 'Rejected by Admin');
                        }}
                        disabled={isProcessing === selectedKYC._id}
                        className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing === selectedKYC._id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 inline mr-2 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 inline mr-2" />
                            Reject KYC
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          closeDetailsModal();
                          handleApproveKYC(selectedKYC._id);
                        }}
                        disabled={isProcessing === selectedKYC._id}
                        className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing === selectedKYC._id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 inline mr-2 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 inline mr-2" />
                            Approve KYC
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default KYCManagement; 