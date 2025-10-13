import { useState, useEffect } from 'react';
import { buildApiUrl } from '../../utils/config';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  Shield, 
  FileText, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  BarChart3,
  Plus,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminLoanManagement from '../../components/admin/AdminLoanManagement';
import AdminCollateralReview from '../../components/admin/AdminCollateralReview';
import PendingLoansSection from '../../components/common/PendingLoansSection';
import WalletBalanceCard from '../../components/common/WalletBalanceCard';
import FeedbackManagement from '../../components/admin/FeedbackManagement';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingKYC: 0,
    pendingLoans: 0,
    totalTransactions: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [creatingTestData, setCreatingTestData] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedLoanForFeedback, setSelectedLoanForFeedback] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Authentication required');
      }

        // Fetch admin dashboard statistics
        const response = await fetch(buildApiUrl('/admin/dashboard/stats'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          const data = result.data;
          
          console.log('Admin dashboard data received:', data);
          
          // Update stats with real data
          setStats({
            totalUsers: data.users.total,
            pendingKYC: data.users.pendingKYC,
            approvedKYC: data.users.approvedKYC,
            pendingLoans: data.loans.pending,
            totalTransactions: data.loans.total + data.pools.total
          });
          
          // Process recent activities
          const activities = [];
          
          // Add recent users
          data.recentActivities.users.forEach(user => {
            activities.push({
              id: user._id,
              type: 'user_registered',
              message: `${user.firstName} ${user.lastName} registered as ${user.userType}`,
              timestamp: user.createdAt,
              userType: user.userType
            });
          });
          
          // Add recent KYC submissions
          data.recentActivities.kyc.forEach(kyc => {
            activities.push({
              id: kyc._id,
              type: `kyc_${kyc.kycStatus}`,
              message: `${kyc.firstName} ${kyc.lastName} KYC status: ${kyc.kycStatus}`,
              timestamp: kyc.createdAt,
              userType: 'kyc'
            });
          });
          
          // Add recent loans
          data.recentActivities.loans.forEach(loan => {
            activities.push({
              id: loan._id,
              type: `loan_${loan.status}`,
              message: `Loan application for ₦${loan.loanAmount} - ${loan.purpose} (${loan.status})`,
              timestamp: loan.createdAt,
              userType: 'loan'
            });
          });
          
          // Sort activities by timestamp
          activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setRecentActivities(activities.slice(0, 10));
          
        } else {
          throw new Error('Failed to fetch admin dashboard data');
        }
      } catch (error) {
        console.error('Error loading admin dashboard data:', error);
        // Set default values if API fails
        setStats({
          totalUsers: 0,
          pendingKYC: 0,
          pendingLoans: 0,
          totalTransactions: 0
        });
        setRecentActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getActivityIcon = (type) => {
    const iconConfig = {
      kyc_approved: { icon: CheckCircle, color: 'text-success' },
      loan_approved: { icon: CheckCircle, color: 'text-success' },
      kyc_pending: { icon: Clock, color: 'text-warning' },
      loan_pending: { icon: Clock, color: 'text-warning' },
      kyc_rejected: { icon: AlertCircle, color: 'text-error' },
      loan_rejected: { icon: AlertCircle, color: 'text-error' }
    };

    const config = iconConfig[type] || iconConfig.kyc_pending;
    const Icon = config.icon;

    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  const quickActions = [
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'from-primary-500 to-primary-600'
    },
    {
      title: 'KYC Management',
      description: 'Review and approve KYC submissions',
      icon: Shield,
      href: '/admin/kyc',
      color: 'from-secondary-500 to-secondary-600'
    },
    {
      title: 'Loan Management',
      description: 'Review and approve loan applications',
      icon: FileText,
      href: '/admin/loans',
      color: 'from-accent-500 to-accent-600'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Welcome back, {user?.name}. Here's your platform overview.
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-neutral-200 dark:border-secondary-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'loans'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            Loan Applications
          </button>
          <button
            onClick={() => setActiveTab('collateral')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'collateral'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            Collateral Verification
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'feedback'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            Feedback Management
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-neutral-200 dark:border-secondary-700 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Total Users
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                    {stats.totalUsers.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-neutral-200 dark:border-secondary-700 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Approved KYC
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                    {stats.approvedKYC ?? 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning/20 dark:bg-warning/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-warning dark:text-warning/50" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-neutral-200 dark:border-secondary-700 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Pending Loans
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                    {stats.pendingLoans}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/20 dark:bg-success/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-success dark:text-success/50" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-neutral-200 dark:border-secondary-700 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Total Transactions
                  </p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                    {stats.totalTransactions.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </motion.div>
          </div>

      {/* Wallet Balance */}
      <div className="mb-8">
        <WalletBalanceCard userType="admin" />
      </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold text-secondary-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                >
                  <Link
                    to={action.href}
                    className="block bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-neutral-200 dark:border-secondary-700 p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                      {action.title}
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
                      {action.description}
                    </p>
                    <div className="flex items-center text-primary-600 dark:text-primary-400 font-medium text-sm group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                      Access
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-neutral-200 dark:border-secondary-700 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Recent Activities
              </h3>
              <BarChart3 className="h-5 w-5 text-neutral-400" />
            </div>
        
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 p-4 bg-neutral-50 dark:bg-secondary-800 rounded-lg">
              <div className="flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 dark:text-white">
                  {activity.message}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  User Type: {activity.userType}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-neutral-500 dark:text-neutral-500">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pending Loans Section */}
      <PendingLoansSection userType="admin" title="All Pending Loans" />

          {/* Platform Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg shadow-sm border border-neutral-200 dark:border-secondary-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-success/20 dark:bg-success/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-success dark:text-success/50" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                    Platform Status: Healthy
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    All systems are running smoothly
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-success dark:text-success/50">99.9%</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Uptime</p>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Loan Applications Tab */}
      {activeTab === 'loans' && (
        <AdminLoanManagement />
      )}

      {/* Collateral Verification Tab */}
      {activeTab === 'collateral' && (
        <AdminCollateralReview />
      )}

      {/* Feedback Management Tab */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-sm border border-neutral-200 dark:border-secondary-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
                    Feedback Management
                  </h2>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Send feedback to borrowers and lenders, manage communication
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 rounded-lg p-6 border border-primary-200 dark:border-primary-800">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-900 dark:text-white">Send Feedback</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Communicate with users</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">
                  Send feedback to borrowers and lenders about their loan applications, collateral verification, or any other matters.
                </p>
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Send Feedback</span>
                </button>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 rounded-lg p-6 border border-success/30 dark:border-success">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-success rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-900 dark:text-white">View Responses</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Check user replies</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">
                  View and manage responses from borrowers and lenders to your feedback messages.
                </p>
                <button
                  onClick={() => {
                    // This would open a feedback inbox or management interface
                    alert('Feedback inbox feature coming soon!');
                  }}
                  className="w-full px-4 py-2 bg-success text-white rounded-lg hover:bg-success transition-colors flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>View Responses</span>
                </button>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 rounded-lg p-6 border border-accent-200 dark:border-accent-800">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-accent-600 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-900 dark:text-white">Feedback Analytics</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Track communication</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">
                  View analytics and statistics about your feedback communication with users.
                </p>
                <button
                  onClick={() => {
                    // This would open analytics
                    alert('Feedback analytics feature coming soon!');
                  }}
                  className="w-full px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>View Analytics</span>
                </button>
              </div>
            </div>

            <div className="mt-8 p-4 bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-warning dark:text-warning/50 mt-0.5" />
                <div>
                  <h4 className="font-medium text-warning dark:text-warning/30">Quick Access</h4>
                  <p className="text-sm text-warning dark:text-warning/40 mt-1">
                    You can also send feedback directly from the Loan Applications and Collateral Verification tabs by clicking the "Chat Borrower" or "Chat Lender" buttons.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackManagement
          loanId="general-feedback"
          loanData={{
            purpose: "General Feedback",
            loanAmount: 0,
            borrower: { _id: "general", firstName: "General", lastName: "User" },
            lender: { _id: "general", firstName: "General", lastName: "User" }
          }}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard; 