import { useState, useEffect } from 'react';
import { buildApiUrl } from '../../utils/config';
import { motion } from 'framer-motion';
import { 
  FileText, 
  User, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Eye,
  Clock,
  AlertCircle,
  TrendingUp,
  Filter,
  Search,
  Shield,
  Users,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import FeedbackManagement from './FeedbackManagement';
import AdminChat from '../chat/AdminChat';
import { useAuth } from '../../context/AuthContext';

const AdminLoanManagement = () => {
  const { user } = useAuth();
  const [loanApplications, setLoanApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    funded: 0,
    rejected: 0
  });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedLoanForFeedback, setSelectedLoanForFeedback] = useState(null);
  const [showAdminChat, setShowAdminChat] = useState(false);
  const [chatTargetUser, setChatTargetUser] = useState(null);
  const [chatTargetUserType, setChatTargetUserType] = useState(null);

  useEffect(() => {
    loadLoanApplications();
  }, [statusFilter]);

  const loadLoanApplications = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      
      console.log('Loading loan applications...');
      
      // Use the admin loans endpoint to get ALL loans
      const response = await fetch(buildApiUrl(`/admin/loans`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Loan applications response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Loan applications result:', result);
        
        const loans = result.data.loans || [];
        setLoanApplications(loans);
        
        // Calculate summary from the loans
        const summaryData = {
          total: loans.length,
          pending: loans.filter(loan => loan.status === 'pending').length,
          approved: loans.filter(loan => loan.status === 'approved').length,
          funded: loans.filter(loan => loan.status === 'funded').length,
          rejected: loans.filter(loan => loan.status === 'rejected').length
        };
        
        console.log('Loan summary:', summaryData);
        setSummary(summaryData);
      } else {
        const errorText = await response.text();
        console.error('Failed to load loan applications:', response.status, errorText);
        setError('Failed to load loan applications');
      }
    } catch (error) {
      console.error('Error loading loan applications:', error);
      setError('Failed to load loan applications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (application) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`/loans/${application.id}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedApplication(result.data);
        setShowModal(true);
      } else {
        alert('Failed to load loan details');
      }
    } catch (error) {
      console.error('Error loading loan details:', error);
      alert('Failed to load loan details');
    }
  };

  const handleSendFeedback = (application, recipientType) => {
    console.log('🔍 handleSendFeedback called:', { application, recipientType });
    
    // Set target user based on recipient type
    if (recipientType === 'borrower') {
      console.log('📱 Setting borrower chat target:', application.borrower);
      console.log('📱 Borrower ID:', application.borrower?._id || application.borrower?.id);
      setChatTargetUser(application.borrower);
      setChatTargetUserType('borrower');
    } else if (recipientType === 'lender') {
      // Lender information comes from lendingPool.creator
      const lender = application.lendingPool?.creator;
      console.log('🏦 Setting lender chat target:', lender);
      console.log('🏦 Lender ID:', lender?._id || lender?.id);
      console.log('🏦 Lending pool data:', application.lendingPool);
      
      if (!lender) {
        alert('Lender information not available. This loan may not be associated with a lending pool yet.');
        return;
      }
      
      if (!lender._id && !lender.id) {
        console.error('❌ Lender object exists but has no ID:', lender);
        alert('Lender information is incomplete. Please try refreshing the page or contact support.');
        return;
      }
      
      setChatTargetUser(lender);
      setChatTargetUserType('lender');
    }
    setShowAdminChat(true);
  };

  const handleApproveReject = async (action) => {
    if (!selectedApplication) return;
    
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setIsProcessing(true);
      const token = localStorage.getItem('accessToken');
      
      const endpoint = action === 'approve' 
        ? buildApiUrl(`/admin/loans/${selectedApplication?.id}/approve`)
        : buildApiUrl(`/admin/loans/${selectedApplication?.id}/reject`);
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(action === 'approve' ? {
          action: action,
          rejectionReason: rejectionReason || '',
          adminNotes: adminNotes || ''
        } : {
          reason: rejectionReason || 'No reason provided'
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setShowModal(false);
        setSelectedApplication(null);
        setRejectionReason('');
        setAdminNotes('');
        await loadLoanApplications(); // Refresh the list
      } else {
        const errorData = await response.json();
        alert(`Failed to ${action} loan: ${errorData.message}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing loan:`, error);
      alert(`Failed to ${action} loan application`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-warning bg-warning/20 dark:bg-warning/20 dark:text-warning/50';
      case 'approved': return 'text-success bg-success/20 dark:bg-success/20 dark:text-success/50';
      case 'funded': return 'text-primary-600 bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400';
      case 'rejected': return 'text-error bg-error/20 dark:bg-error/20 dark:text-error/50';
      default: return 'text-neutral-600 bg-neutral-100 dark:bg-secondary-900/20 dark:text-neutral-400';
    }
  };

  const getKycStatusColor = (kycStatus) => {
    switch (kycStatus) {
      case 'verified': return 'text-success bg-success/20 dark:bg-success/20 dark:text-success/50';
      case 'pending': return 'text-warning bg-warning/20 dark:bg-warning/20 dark:text-warning/50';
      case 'rejected': return 'text-error bg-error/20 dark:bg-error/20 dark:text-error/50';
      default: return 'text-neutral-600 bg-neutral-100 dark:bg-secondary-900/20 dark:text-neutral-400';
    }
  };

  const filteredApplications = loanApplications.filter(app => {
    const matchesSearch =
      (app.borrower?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (app.purpose?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (app.id?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
        <p className="text-error dark:text-error/50">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">
            Loan Applications Management
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Review and approve loan applications from borrowers
          </p>
        </div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {loanApplications.length} total applications
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white dark:bg-secondary-800 rounded-lg shadow p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">{summary.total}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-neutral-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white dark:bg-secondary-800 rounded-lg shadow p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Pending</p>
              <p className="text-2xl font-bold text-warning dark:text-warning/50">{summary.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-warning/50" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white dark:bg-secondary-800 rounded-lg shadow p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Approved</p>
              <p className="text-2xl font-bold text-success dark:text-success/50">{summary.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success/50" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white dark:bg-secondary-800 rounded-lg shadow p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Funded</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{summary.funded}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-white dark:bg-secondary-800 rounded-lg shadow p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Rejected</p>
              <p className="text-2xl font-bold text-error dark:text-error/50">{summary.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-error/50" />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by borrower name, purpose, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-secondary-900 dark:text-neutral-100"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-secondary-900 dark:text-neutral-100"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="funded">Funded</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">
            No Loan Applications
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            {searchTerm ? 'No applications match your search criteria.' : 'There are currently no loan applications to review.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredApplications.map((application, index) => (
            <motion.div
              key={application.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white dark:bg-secondary-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              {/* Application Header */}
              <div className="p-6 border-b border-neutral-200 dark:border-secondary-700">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                      {application.purpose}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Application #{application.id.slice(-8)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                      {application.status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getKycStatusColor(application.kycStatus)}`}>
                      KYC: {application.kycStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Application Details */}
              <div className="p-6 space-y-4">
                {/* Borrower Info */}
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="font-medium text-secondary-900 dark:text-white">
                      {application.borrower.name}
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {application.borrower.email}
                    </p>
                  </div>
                </div>

                {/* Loan Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-success dark:text-success/50" />
                    <span className="text-neutral-600 dark:text-neutral-400">Amount:</span>
                    <span className="font-medium text-secondary-900 dark:text-white">
                      ${application.loanAmount?.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    <span className="text-neutral-600 dark:text-neutral-400">Duration:</span>
                    <span className="font-medium text-secondary-900 dark:text-white">
                      {application.duration} months
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-neutral-600 dark:text-neutral-400">Applied:</span>
                    <span className="font-medium text-secondary-900 dark:text-white">
                      {new Date(application.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                    <span className="text-neutral-600 dark:text-neutral-400">Purpose:</span>
                    <span className="font-medium text-secondary-900 dark:text-white capitalize">
                      {application.purpose}
                    </span>
                  </div>
                </div>

                {/* Funding Progress */}
                {application.fundingProgress && (
                  <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white">
                        Funding Progress
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {application.fundingProgress.fundingPercentage}%
                      </p>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${application.fundingProgress.fundingPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      <span>${application.fundingProgress.fundedAmount?.toLocaleString() || 0}</span>
                      <span>${application.fundingProgress.targetAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-6 pt-0 space-y-3">
                <button
                  onClick={() => handleViewDetails(application)}
                  className="w-full px-4 py-2 border border-primary-600 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>Review Application</span>
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSendFeedback(application, 'borrower')}
                    className="px-3 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors flex items-center justify-center space-x-1 text-sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Chat Borrower</span>
                  </button>
                  
                  <button
                    onClick={() => handleSendFeedback(application, 'lender')}
                    disabled={!application.lendingPool?.creator}
                    className="px-3 py-2 bg-success text-white hover:bg-success disabled:bg-neutral-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center space-x-1 text-sm"
                    title={!application.lendingPool?.creator ? "No lender information available" : "Chat with lender"}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Chat Lender</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Application Details Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Loan Application Review
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              {!selectedApplication ? (
                <div className="text-center py-8">
                  <p className="text-neutral-500 dark:text-neutral-400">No application selected</p>
                </div>
              ) : (
                <>
                  {/* Borrower Information */}
                  <div>
                <h4 className="font-medium text-secondary-900 dark:text-white mb-3">Borrower Information</h4>
                <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Name:</span>
                      <span className="font-medium text-secondary-900 dark:text-white">
                        {selectedApplication.borrower?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Email:</span>
                      <span className="font-medium text-secondary-900 dark:text-white">
                        {selectedApplication.borrower?.email || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Phone:</span>
                      <span className="font-medium text-secondary-900 dark:text-white">
                        {selectedApplication.borrower?.phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">KYC Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getKycStatusColor(selectedApplication.kycStatus)}`}>
                        {selectedApplication.kycStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loan Information */}
              <div>
                <h4 className="font-medium text-secondary-900 dark:text-white mb-3">Loan Information</h4>
                <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Amount:</span>
                      <span className="font-medium text-secondary-900 dark:text-white">
                        ${selectedApplication.loanAmount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Duration:</span>
                      <span className="font-medium text-secondary-900 dark:text-white">
                        {selectedApplication.duration} months
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Interest Rate:</span>
                      <span className="font-medium text-secondary-900 dark:text-white">
                        {selectedApplication.interestRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Monthly Payment:</span>
                      <span className="font-medium text-secondary-900 dark:text-white">
                        ${selectedApplication.monthlyPayment?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Total Repayment:</span>
                      <span className="font-medium text-secondary-900 dark:text-white">
                        ${selectedApplication.totalRepayment?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Purpose:</span>
                      <span className="font-medium text-secondary-900 dark:text-white capitalize">
                        {selectedApplication.purpose}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedApplication.status)}`}>
                        {selectedApplication.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600 dark:text-neutral-400">Applied:</span>
                      <span className="font-medium text-secondary-900 dark:text-white">
                        {new Date(selectedApplication.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {selectedApplication.purposeDescription && (
                    <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-600">
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        <span className="font-medium">Description:</span> {selectedApplication.purposeDescription}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Funding Progress */}
              {selectedApplication.fundingProgress && (
                <div>
                  <h4 className="font-medium text-secondary-900 dark:text-white mb-3">Funding Progress</h4>
                  <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Funded Amount:</span>
                        <span className="font-medium text-secondary-900 dark:text-white">
                          ${selectedApplication.fundingProgress.fundedAmount?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Target Amount:</span>
                        <span className="font-medium text-secondary-900 dark:text-white">
                          ${selectedApplication.fundingProgress.targetAmount?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Remaining:</span>
                        <span className="font-medium text-secondary-900 dark:text-white">
                          ${((selectedApplication.fundingProgress.targetAmount || selectedApplication.loanAmount) - (selectedApplication.fundingProgress.fundedAmount || 0)).toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-3">
                        <div 
                          className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${selectedApplication.fundingProgress.fundingPercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                        {selectedApplication.fundingProgress.fundingPercentage}% funded
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Collateral Information */}
              {(selectedApplication.collateral || selectedApplication.collateralVerification) && (
                <div>
                  <h4 className="font-medium text-secondary-900 dark:text-white mb-3">Collateral Information</h4>
                  <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4 space-y-3">
                    {/* Basic Collateral Info */}
                    {selectedApplication.collateral && (
                      <>
                        <div>
                          <p className="text-sm font-medium text-secondary-900 dark:text-white mb-1">Type:</p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 capitalize">
                            {selectedApplication.collateral.type || 'Not specified'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-secondary-900 dark:text-white mb-1">Description:</p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {selectedApplication.collateral.description || 'No description provided'}
                          </p>
                        </div>
                        
                        {selectedApplication.collateral.estimatedValue && (
                          <div>
                            <p className="text-sm font-medium text-secondary-900 dark:text-white mb-1">Estimated Value:</p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              ${selectedApplication.collateral.estimatedValue.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Detailed Collateral Verification */}
                    {selectedApplication.collateralVerification && (
                      <div className="border-t pt-3 mt-3">
                        <h5 className="font-medium text-secondary-900 dark:text-white mb-2">Verified Collateral Documents</h5>
                        
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-secondary-900 dark:text-white mb-1">Verification Status:</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedApplication.collateralVerification.verificationStatus === 'approved' 
                                ? 'bg-success/20 text-success dark:bg-success/20 dark:text-success/50'
                                : 'bg-warning/20 text-warning dark:bg-warning/20 dark:text-warning/50'
                            }`}>
                              {selectedApplication.collateralVerification.verificationStatus}
                            </span>
                          </div>

                          {selectedApplication.collateralVerification.type && (
                            <div>
                              <p className="text-sm font-medium text-secondary-900 dark:text-white mb-1">Verified Type:</p>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 capitalize">
                                {selectedApplication.collateralVerification.type}
                              </p>
                            </div>
                          )}

                          {selectedApplication.collateralVerification.description && (
                            <div>
                              <p className="text-sm font-medium text-secondary-900 dark:text-white mb-1">Verified Description:</p>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                {selectedApplication.collateralVerification.description}
                              </p>
                            </div>
                          )}

                          {selectedApplication.collateralVerification.estimatedValue && (
                            <div>
                              <p className="text-sm font-medium text-secondary-900 dark:text-white mb-1">Verified Value:</p>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                ${selectedApplication.collateralVerification.estimatedValue.toLocaleString()}
                              </p>
                            </div>
                          )}

                          {selectedApplication.collateralVerification.bvn && (
                            <div>
                              <p className="text-sm font-medium text-secondary-900 dark:text-white mb-1">BVN:</p>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                {selectedApplication.collateralVerification.bvn}
                              </p>
                            </div>
                          )}

                          {/* Collateral Documents */}
                          {selectedApplication.collateralVerification.documents && selectedApplication.collateralVerification.documents.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-secondary-900 dark:text-white mb-2">Collateral Documents:</p>
                              <div className="space-y-2">
                                {selectedApplication.collateralVerification.documents.map((doc, index) => (
                                  <div key={index} className="flex items-center justify-between bg-white dark:bg-neutral-600 rounded p-2">
                                    <div className="flex items-center space-x-2">
                                      <FileText className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                      <span className="text-sm text-secondary-900 dark:text-white">{doc.originalName || doc.fileName}</span>
                                      <span className="text-xs text-neutral-500">({doc.documentType})</span>
                                    </div>
                                    {doc.fileUrl && (
                                      <a 
                                        href={doc.fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary-600 hover:text-primary-800 text-sm underline"
                                      >
                                        View Document
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bank Statement */}
                          {selectedApplication.collateralVerification.bankStatement && selectedApplication.collateralVerification.bankStatement.fileUrl && (
                            <div>
                              <p className="text-sm font-medium text-secondary-900 dark:text-white mb-2">Bank Statement:</p>
                              <div className="flex items-center justify-between bg-white dark:bg-neutral-600 rounded p-2">
                                <div className="flex items-center space-x-2">
                                  <FileText className="h-4 w-4 text-success dark:text-success/50" />
                                  <span className="text-sm text-secondary-900 dark:text-white">
                                    {selectedApplication.collateralVerification.bankStatement.originalName || selectedApplication.collateralVerification.bankStatement.fileName}
                                  </span>
                                </div>
                                <a 
                                  href={selectedApplication.collateralVerification.bankStatement.fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-success hover:text-success text-sm underline"
                                >
                                  View Statement
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Basic Collateral Documents (fallback) */}
                    {selectedApplication.collateral && selectedApplication.collateral.documents && selectedApplication.collateral.documents.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-secondary-900 dark:text-white mb-2">Basic Documents:</p>
                        <div className="space-y-2">
                          {selectedApplication.collateral.documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between bg-white dark:bg-neutral-600 rounded p-2">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                <span className="text-sm text-secondary-900 dark:text-white">{doc.name}</span>
                              </div>
                              {doc.url && (
                                <a 
                                  href={doc.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
                                >
                                  View
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label htmlFor="adminNotes" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Admin Notes
                </label>
                <textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any administrative notes..."
                  rows="3"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-secondary-900 dark:text-neutral-100"
                />
              </div>

              {/* Action Buttons */}
              {selectedApplication.status === 'pending' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="rejectionReason" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Rejection Reason (if rejecting)
                    </label>
                    <textarea
                      id="rejectionReason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      rows="3"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-secondary-900 dark:text-neutral-100"
                    />
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleApproveReject('approve')}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-success hover:bg-success disabled:bg-success/50 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>{isProcessing ? 'Processing...' : 'Approve'}</span>
                    </button>
                    
                    <button
                      onClick={() => handleApproveReject('reject')}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-error hover:bg-error disabled:bg-error/50 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>{isProcessing ? 'Processing...' : 'Reject'}</span>
                    </button>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Management Modal */}
      {showFeedbackModal && selectedLoanForFeedback && (
        <FeedbackManagement
          loanId={selectedLoanForFeedback.id}
          loanData={selectedLoanForFeedback}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedLoanForFeedback(null);
          }}
        />
      )}

      {/* Admin Chat Modal */}
      {showAdminChat && chatTargetUser && (chatTargetUser._id || chatTargetUser.id) && (
        (() => {
          console.log('🔍 Rendering AdminChat with data:');
          console.log('  - showAdminChat:', showAdminChat);
          console.log('  - chatTargetUser:', chatTargetUser);
          console.log('  - chatTargetUserType:', chatTargetUserType);
          console.log('  - currentUser:', user);
          return (
        <AdminChat
          isOpen={showAdminChat}
          onClose={() => {
            setShowAdminChat(false);
            setChatTargetUser(null);
            setChatTargetUserType(null);
          }}
          targetUser={chatTargetUser}
          targetUserType={chatTargetUserType}
          currentUser={{
            id: user?.id,
            firstName: user?.firstName,
            lastName: user?.lastName,
            userType: user?.userType
          }}
        />
          );
        })()
      )}
    </div>
  );
};

export default AdminLoanManagement;
