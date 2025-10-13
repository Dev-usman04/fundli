const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

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