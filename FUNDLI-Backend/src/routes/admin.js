const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Loan = require('../models/Loan');
const LendingPool = require('../models/LendingPool');
const Wallet = require('../models/Wallet');

const router = express.Router();

// @desc    Get all KYC applications
// @route   GET /api/admin/kyc-applications
// @access  Private (Admin only)
router.get('/kyc-applications', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('🔍 Fetching KYC applications for admin review');

    // Get all users with KYC data
    const users = await User.find({
      $or: [
        { kycStatus: { $exists: true } },
        { documentImage: { $exists: true } },
        { liveFaceImage: { $exists: true } },
        { 'kycData.bvn': { $exists: true } },
        { 'kycData.bankAccount': { $exists: true } }
      ]
    })
    .select('firstName lastName email phone userType kycStatus kycVerified documentImage liveFaceImage verificationScore kycVerificationDetails kycData createdAt updatedAt')
    .sort({ createdAt: -1 });

    // Transform data for admin interface
    const kycApplications = users.map(user => ({
      _id: user._id,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        userType: user.userType
      },
      kycStatus: user.kycStatus || 'pending',
      kycVerified: user.kycVerified || false,
      documentImage: user.documentImage,
      liveFaceImage: user.liveFaceImage,
      verificationScore: user.verificationScore,
      kycVerificationDetails: user.kycVerificationDetails,
      kycData: user.kycData,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    console.log(`✅ Retrieved ${kycApplications.length} KYC applications`);

    res.status(200).json({
      status: 'success',
      data: kycApplications
    });

  } catch (error) {
    console.error('❌ Error fetching KYC applications:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch KYC applications',
      error: error.message
    });
  }
});

// @desc    Update KYC application status
// @route   PUT /api/admin/kyc-applications/update-status
// @access  Private (Admin only)
router.put('/kyc-applications/update-status', protect, authorize('admin'), async (req, res) => {
  try {
    const { applicationId, status, reason } = req.body;

    if (!applicationId || !status) {
      return res.status(400).json({
        status: 'error',
        message: 'Application ID and status are required'
      });
    }

    console.log(`🔍 Updating KYC status for user ${applicationId} to ${status}`);

    const user = await User.findById(applicationId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Update KYC status
    user.kycStatus = status;
    user.kycVerified = status === 'verified';
    user.kycData.reviewedAt = new Date();
    user.kycData.reviewedBy = req.user.id;

    if (status === 'failed' && reason) {
      user.kycData.rejectionReason = reason;
    } else if (status === 'verified') {
      user.kycData.rejectionReason = null;
    }

    await user.save();

    console.log(`✅ KYC status updated successfully for user ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'KYC status updated successfully',
      data: {
        userId: user._id,
        kycStatus: user.kycStatus,
        kycVerified: user.kycVerified,
        reviewedAt: user.kycData.reviewedAt,
        reviewedBy: user.kycData.reviewedBy
      }
    });

  } catch (error) {
    console.error('❌ Error updating KYC status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update KYC status',
      error: error.message
    });
  }
});

// @desc    Get KYC statistics
// @route   GET /api/admin/kyc-statistics
// @access  Private (Admin only)
router.get('/kyc-statistics', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('📊 Fetching KYC statistics');

    // Get KYC statistics
    const totalUsers = await User.countDocuments();
    const pendingKYC = await User.countDocuments({ kycStatus: 'pending' });
    const verifiedKYC = await User.countDocuments({ kycStatus: 'verified' });
    const failedKYC = await User.countDocuments({ kycStatus: 'failed' });
    const incompleteKYC = await User.countDocuments({
      $or: [
        { kycStatus: { $exists: false } },
        { kycStatus: null }
      ]
    });

    // Get recent KYC applications (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentApplications = await User.countDocuments({
      'kycData.submittedAt': { $gte: thirtyDaysAgo }
    });

    // Get KYC completion rate
    const completionRate = totalUsers > 0 ? Math.round((verifiedKYC / totalUsers) * 100) : 0;

    const statistics = {
      totalUsers,
      kycStatus: {
        pending: pendingKYC,
        verified: verifiedKYC,
        failed: failedKYC,
        incomplete: incompleteKYC
      },
      recentApplications,
      completionRate,
      lastUpdated: new Date()
    };

    console.log('✅ KYC statistics retrieved successfully');

    res.status(200).json({
      status: 'success',
      data: statistics
    });

  } catch (error) {
    console.error('❌ Error fetching KYC statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch KYC statistics',
      error: error.message
    });
  }
});

// @desc    Get user KYC details
// @route   GET /api/admin/kyc-applications/:userId
// @access  Private (Admin only)
router.get('/kyc-applications/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`🔍 Fetching KYC details for user ${userId}`);

    const user = await User.findById(userId)
      .select('firstName lastName email phone userType kycStatus kycVerified documentImage liveFaceImage verificationScore kycVerificationDetails kycData createdAt updatedAt');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const kycDetails = {
      _id: user._id,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        userType: user.userType
      },
      kycStatus: user.kycStatus || 'pending',
      kycVerified: user.kycVerified || false,
      documentImage: user.documentImage,
      liveFaceImage: user.liveFaceImage,
      verificationScore: user.verificationScore,
      kycVerificationDetails: user.kycVerificationDetails,
      kycData: user.kycData,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    console.log(`✅ KYC details retrieved for user ${user.email}`);

    res.status(200).json({
      status: 'success',
      data: kycDetails
    });

  } catch (error) {
    console.error('❌ Error fetching KYC details:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch KYC details',
      error: error.message
    });
  }
});

// @desc    Bulk update KYC status
// @route   PUT /api/admin/kyc-applications/bulk-update
// @access  Private (Admin only)
router.put('/kyc-applications/bulk-update', protect, authorize('admin'), async (req, res) => {
  try {
    const { applicationIds, status, reason } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Application IDs array is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        status: 'error',
        message: 'Status is required'
      });
    }

    console.log(`🔍 Bulk updating KYC status for ${applicationIds.length} applications to ${status}`);

    const updateData = {
      kycStatus: status,
      kycVerified: status === 'verified',
      'kycData.reviewedAt': new Date(),
      'kycData.reviewedBy': req.user.id
    };

    if (status === 'failed' && reason) {
      updateData['kycData.rejectionReason'] = reason;
    } else if (status === 'verified') {
      updateData['kycData.rejectionReason'] = null;
    }

    const result = await User.updateMany(
      { _id: { $in: applicationIds } },
      { $set: updateData }
    );

    console.log(`✅ Bulk update completed: ${result.modifiedCount} applications updated`);

    res.status(200).json({
      status: 'success',
      message: 'Bulk update completed successfully',
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });

  } catch (error) {
    console.error('❌ Error in bulk update:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform bulk update',
      error: error.message
    });
  }
});

module.exports = router; 

// -----------------------------
// Additional Admin Endpoints
// -----------------------------

// @desc    Admin dashboard aggregate statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin only)
router.get('/dashboard/stats', protect, authorize('admin'), async (req, res) => {
  try {
    // Totals
    const [totalUsers, pendingKYC, approvedKYC, totalLoans, pendingLoans, totalPools] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ kycStatus: 'pending' }),
      User.countDocuments({ kycStatus: { $in: ['approved', 'verified'] } }),
      Loan.countDocuments(),
      Loan.countDocuments({ status: 'pending' }),
      LendingPool.countDocuments().catch(() => 0)
    ]);

    // Recent activities (limit 10 each, last 30 days where relevant)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentUsers, recentKYCUsers, recentLoans] = await Promise.all([
      User.find({})
        .select('_id firstName lastName userType createdAt')
        .sort({ createdAt: -1 })
        .limit(10),
      User.find({
        $or: [
          { 'kycData.submittedAt': { $gte: thirtyDaysAgo } },
          { kycStatus: { $in: ['pending', 'approved', 'rejected'] } }
        ]
      })
        .select('_id firstName lastName kycStatus createdAt')
        .sort({ createdAt: -1 })
        .limit(10),
      Loan.find({})
        .select('_id status loanAmount purpose createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    const data = {
      users: {
        total: totalUsers,
        pendingKYC: pendingKYC,
        approvedKYC: approvedKYC
      },
      loans: {
        total: totalLoans,
        pending: pendingLoans
      },
      pools: {
        total: totalPools
      },
      recentActivities: {
        users: recentUsers,
        kyc: recentKYCUsers.map(u => ({
          _id: u._id,
          firstName: u.firstName,
          lastName: u.lastName,
          kycStatus: u.kycStatus || 'pending',
          createdAt: u.createdAt
        })),
        loans: recentLoans
      }
    };

    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('❌ Error fetching admin dashboard stats:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch admin dashboard stats' });
  }
});

// @desc    Get admin wallet balance (for dashboard card)
// @route   GET /api/admin/wallet/balance
// @access  Private (Admin only)
router.get('/wallet/balance', protect, authorize('admin'), async (req, res) => {
  try {
    const userId = req.user.id;

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      // Create a default wallet for admin if not exists
      wallet = await Wallet.create({ user: userId, balance: 0, currency: 'USD', status: 'active' });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        balance: wallet.balance,
        currency: wallet.currency || 'USD',
        status: wallet.status || 'active',
        limits: wallet.limits,
        stats: wallet.stats
      }
    });
  } catch (error) {
    console.error('❌ Error fetching admin wallet balance:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch admin wallet balance' });
  }
});

// -----------------------------
// KYC Admin Endpoints expected by UI
// -----------------------------

// Helper to map stored KYC status to UI terms
const mapKycStatusForUI = (status) => {
  if (status === 'verified') return 'approved';
  if (status === 'failed') return 'rejected';
  return status || 'pending';
};

// Build simplified KYC item for lists
const buildKycListItem = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  userType: user.userType,
  kycStatus: mapKycStatusForUI(user.kycStatus),
  createdAt: user.createdAt,
  kycDocuments: user.kycData || {}
});

// @desc    Get pending KYC submissions
// @route   GET /api/admin/kyc/pending
// @access  Private (Admin only)
router.get('/kyc/pending', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ kycStatus: 'pending' })
      .select('firstName lastName email userType kycStatus kycData createdAt');
    const data = users.map(buildKycListItem);
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('❌ Error fetching pending KYC:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch pending KYC' });
  }
});

// @desc    Get approved KYC submissions
// @route   GET /api/admin/kyc/approved
// @access  Private (Admin only)
router.get('/kyc/approved', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ $or: [{ kycStatus: 'approved' }, { kycStatus: 'verified' }] })
      .select('firstName lastName email userType kycStatus kycData createdAt');
    const data = users.map(buildKycListItem);
    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('❌ Error fetching approved KYC:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch approved KYC' });
  }
});

// @desc    Get all KYC submissions with pagination and optional filtering
// @route   GET /api/admin/kyc/all
// @access  Private (Admin only)
router.get('/kyc/all', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const currentPage = Math.max(1, Number(page));
    const itemsPerPage = Math.max(1, Number(limit));
    const skip = (currentPage - 1) * itemsPerPage;

    const query = {};
    if (status && status !== 'all') {
      if (status === 'approved') query.kycStatus = { $in: ['approved', 'verified'] };
      else if (status === 'rejected') query.kycStatus = { $in: ['rejected', 'failed'] };
      else query.kycStatus = status;
    }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, totalItems] = await Promise.all([
      User.find(query)
        .select('firstName lastName email userType kycStatus kycData createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(itemsPerPage),
      User.countDocuments(query)
    ]);

    const data = users.map(buildKycListItem);
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    return res.status(200).json({
      status: 'success',
      data,
      pagination: { totalItems, totalPages, currentPage, itemsPerPage }
    });
  } catch (error) {
    console.error('❌ Error fetching all KYC:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch KYC submissions' });
  }
});

// @desc    Get detailed KYC for a user
// @route   GET /api/admin/kyc/:userId/details
// @access  Private (Admin only)
router.get('/kyc/:userId/details', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .select('firstName lastName email phone userType kycStatus kycData documentImage liveFaceImage createdAt');

    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

    const data = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      kycStatus: mapKycStatusForUI(user.kycStatus),
      createdAt: user.createdAt,
      kycDocuments: {
        idType: user.kycData?.documentType,
        idNumber: user.kycData?.documentNumber,
        dateOfBirth: user.kycData?.dateOfBirth,
        address: user.kycData?.address,
        submittedAt: user.kycData?.submittedAt,
        documents: {
          idFront: user.documentImage ? { url: user.documentImage } : undefined,
          selfie: user.liveFaceImage ? { url: user.liveFaceImage } : undefined
        }
      }
    };

    return res.status(200).json({ status: 'success', data });
  } catch (error) {
    console.error('❌ Error fetching KYC details:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch KYC details' });
  }
});

// @desc    Approve KYC for a user
// @route   PUT /api/admin/kyc/:userId/approve
// @access  Private (Admin only)
router.put('/kyc/:userId/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

    user.kycStatus = 'approved';
    user.kycVerified = true;
    user.kycData = user.kycData || {};
    user.kycData.reviewedAt = new Date();
    user.kycData.reviewedBy = req.user.id;
    await user.save();

    return res.status(200).json({ status: 'success', message: 'KYC approved', data: { userId: user._id, kycStatus: 'approved' } });
  } catch (error) {
    console.error('❌ Error approving KYC:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to approve KYC' });
  }
});

// @desc    Reject KYC for a user
// @route   PUT /api/admin/kyc/:userId/reject
// @access  Private (Admin only)
router.put('/kyc/:userId/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body || {};
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

    user.kycStatus = 'rejected';
    user.kycVerified = false;
    user.kycData = user.kycData || {};
    user.kycData.reviewedAt = new Date();
    user.kycData.reviewedBy = req.user.id;
    if (reason) user.kycData.rejectionReason = reason;
    await user.save();

    return res.status(200).json({ status: 'success', message: 'KYC rejected', data: { userId: user._id, kycStatus: 'rejected' } });
  } catch (error) {
    console.error('❌ Error rejecting KYC:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to reject KYC' });
  }
});

// @desc    Get all users (with optional filters)
// @route   GET /api/admin/users
// @access  Private (Admin only)
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { search, userType, isActive, kycStatus, page = 1, limit = 10 } = req.query;

    const query = {};
    if (userType && userType !== 'all') query.userType = userType;
    if (typeof isActive !== 'undefined') query.isActive = isActive === 'true';
    if (kycStatus && kycStatus !== 'all') query.kycStatus = kycStatus;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const currentPage = Math.max(1, Number(page));
    const itemsPerPage = Math.max(1, Number(limit));
    const skip = (currentPage - 1) * itemsPerPage;

    const [users, totalItems] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(itemsPerPage),
      User.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    return res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch users' });
  }
});

// @desc    Update user status
// @route   PUT /api/admin/users/:userId/status
// @access  Private (Admin only)
router.put('/users/:userId/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ status: 'error', message: 'status is required' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { status } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    return res.status(200).json({ status: 'success', data: user });
  } catch (error) {
    console.error('❌ Error updating user status:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update user status' });
  }
});

// @desc    Update user fields (isActive, kycStatus)
// @route   PUT /api/admin/users/:userId
// @access  Private (Admin only)
router.put('/users/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const update = {};
    if (typeof req.body.isActive !== 'undefined') update.isActive = !!req.body.isActive;
    if (typeof req.body.kycStatus !== 'undefined') update.kycStatus = req.body.kycStatus;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ status: 'error', message: 'No valid fields to update' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    return res.status(200).json({ status: 'success', data: user });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update user' });
  }
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:userId
// @access  Private (Admin only)
router.delete('/users/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    return res.status(200).json({ status: 'success', message: 'User deleted' });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to delete user' });
  }
});

// @desc    Get all loans (with optional filters)
// @route   GET /api/admin/loans
// @access  Private (Admin only)
router.get('/loans', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, borrowerId, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (borrowerId) query.borrower = borrowerId;

    const currentPage = Math.max(1, Number(page));
    const itemsPerPage = Math.max(1, Number(limit));
    const skip = (currentPage - 1) * itemsPerPage;
    const [loans, totalItems] = await Promise.all([
      Loan.find(query)
        .populate('borrower', 'firstName lastName email userType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(itemsPerPage),
      Loan.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    return res.status(200).json({
      status: 'success',
      data: {
        loans,
        pagination: {
          totalItems,
          totalPages,
          currentPage,
          itemsPerPage,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching loans:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch loans' });
  }
});

// @desc    Approve a loan
// @route   POST /api/admin/loans/:loanId/approve
// @access  Private (Admin only)
router.put('/loans/:loanId/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const { loanId } = req.params;
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ status: 'error', message: 'Loan not found' });
    }

    if (loan.status === 'approved') {
      return res.status(200).json({ status: 'success', message: 'Loan already approved', data: loan });
    }

    loan.status = 'approved';
    loan.adminApprovedAt = new Date();
    loan.adminApprovedBy = req.user.id;
    await loan.save();

    return res.status(200).json({ status: 'success', message: 'Loan approved', data: loan });
  } catch (error) {
    console.error('❌ Error approving loan:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to approve loan' });
  }
});

// @desc    Reject a loan
// @route   PUT /api/admin/loans/:loanId/reject
// @access  Private (Admin only)
router.put('/loans/:loanId/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const { loanId } = req.params;
    const { reason } = req.body || {};
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ status: 'error', message: 'Loan not found' });
    }

    loan.status = 'rejected';
    loan.adminRejectedAt = new Date();
    loan.adminRejectedBy = req.user.id;
    if (reason) loan.rejectionReason = reason;
    await loan.save();

    return res.status(200).json({ status: 'success', message: 'Loan rejected', data: loan });
  } catch (error) {
    console.error('❌ Error rejecting loan:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to reject loan' });
  }
});