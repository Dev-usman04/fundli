const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { faceComparisonService } = require('../services/faceComparisonService');
const { bvnVerificationService } = require('../services/bvnVerificationService');
const { bankVerificationService } = require('../services/bankVerificationService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/kyc');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.id}-${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
  }
});

// @desc    Upload KYC document
// @route   POST /api/kyc/upload-document
// @access  Private
router.post('/upload-document', protect, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No document file uploaded'
      });
    }

    const { documentType, documentNumber } = req.body;

    // Update user with document information
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Remove old document if exists
    if (user.documentImage) {
      try {
        await fs.unlink(path.join(__dirname, '../../uploads/kyc', path.basename(user.documentImage)));
      } catch (error) {
        console.log('Old document file not found or already deleted');
      }
    }

    user.documentImage = `/uploads/kyc/${req.file.filename}`;
    user.kycVerificationDetails.documentType = documentType;
    user.kycVerificationDetails.documentNumber = documentNumber;
    user.kycStatus = 'pending';

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Document uploaded successfully',
      data: {
        documentImage: user.documentImage,
        documentType: user.kycVerificationDetails.documentType,
        documentNumber: user.kycVerificationDetails.documentNumber
      }
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload document',
      error: error.message
    });
  }
});

// @desc    Capture live face for verification
// @route   POST /api/kyc/capture-face
// @access  Private
router.post('/capture-face', protect, upload.single('liveFace'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No face image captured'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (!user.documentImage) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a document first'
      });
    }

    // Remove old live face image if exists
    if (user.liveFaceImage) {
      try {
        await fs.unlink(path.join(__dirname, '../../uploads/kyc', path.basename(user.liveFaceImage)));
      } catch (error) {
        console.log('Old live face file not found or already deleted');
      }
    }

    user.liveFaceImage = `/uploads/kyc/${req.file.filename}`;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Face captured successfully',
      data: {
        liveFaceImage: user.liveFaceImage
      }
    });

  } catch (error) {
    console.error('Error capturing face:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to capture face',
      error: error.message
    });
  }
});

// @desc    Perform face comparison and verification
// @route   POST /api/kyc/verify-faces
// @access  Private
router.post('/verify-faces', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (!user.documentImage || !user.liveFaceImage) {
      return res.status(400).json({
        status: 'error',
        message: 'Both document and live face images are required for verification'
      });
    }

    // Get full file paths
    const documentPath = path.join(__dirname, '../../uploads/kyc', path.basename(user.documentImage));
    const liveFacePath = path.join(__dirname, '../../uploads/kyc', path.basename(user.liveFaceImage));

    // Perform face comparison
    const comparisonResult = await faceComparisonService.compareFaces(documentPath, liveFacePath);

    // Update user with verification results
    user.verificationScore = comparisonResult.similarityScore;
    user.kycVerificationDetails.verificationDate = new Date();
    user.kycVerificationDetails.livenessCheckPassed = comparisonResult.livenessCheckPassed;

    // Determine verification status based on score
    if (comparisonResult.similarityScore >= 70 && comparisonResult.livenessCheckPassed) {
      user.kycStatus = 'verified';
      user.kycVerified = true;
    } else {
      user.kycStatus = 'failed';
      user.kycVerified = false;
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Face verification completed',
      data: {
        verificationScore: user.verificationScore,
        kycStatus: user.kycStatus,
        kycVerified: user.kycVerified,
        verificationDate: user.kycVerificationDetails.verificationDate,
        livenessCheckPassed: user.kycVerificationDetails.livenessCheckPassed,
        comparisonDetails: {
          similarityScore: comparisonResult.similarityScore,
          confidence: comparisonResult.confidence,
          faceDetected: comparisonResult.faceDetected
        }
      }
    });

  } catch (error) {
    console.error('Error verifying faces:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify faces',
      error: error.message
    });
  }
});

// @desc    Get KYC verification status
// @route   GET /api/kyc/status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'kycStatus kycVerified documentImage liveFaceImage verificationScore kycVerificationDetails'
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        kycStatus: user.kycStatus,
        kycVerified: user.kycVerified,
        documentImage: user.documentImage,
        liveFaceImage: user.liveFaceImage,
        verificationScore: user.verificationScore,
        verificationDetails: user.kycVerificationDetails
      }
    });

  } catch (error) {
    console.error('Error fetching KYC status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch KYC status',
      error: error.message
    });
  }
});

// @desc    Reset KYC verification (for retry)
// @route   POST /api/kyc/reset
// @access  Private
router.post('/reset', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Remove uploaded files
    if (user.documentImage) {
      try {
        await fs.unlink(path.join(__dirname, '../../uploads/kyc', path.basename(user.documentImage)));
      } catch (error) {
        console.log('Document file not found or already deleted');
      }
    }

    if (user.liveFaceImage) {
      try {
        await fs.unlink(path.join(__dirname, '../../uploads/kyc', path.basename(user.liveFaceImage)));
      } catch (error) {
        console.log('Live face file not found or already deleted');
      }
    }

    // Reset KYC fields
    user.kycStatus = 'pending';
    user.kycVerified = false;
    user.documentImage = null;
    user.liveFaceImage = null;
    user.verificationScore = null;
    user.kycVerificationDetails = {
      documentType: null,
      documentNumber: null,
      verificationDate: null,
      verificationMethod: 'facial_verification',
      livenessCheckPassed: false
    };

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'KYC verification reset successfully'
    });

  } catch (error) {
    console.error('Error resetting KYC:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset KYC verification',
      error: error.message
    });
  }
});

// @desc    Complete KYC verification with BVN and bank account
// @route   POST /api/kyc/complete-verification
// @access  Private
router.post('/complete-verification', protect, async (req, res) => {
  try {
    const { bvn, bankAccount } = req.body;

    // Validate required fields
    if (!bvn || !bankAccount) {
      return res.status(400).json({
        status: 'error',
        message: 'BVN and bank account details are required'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    console.log('🔍 Starting complete KYC verification for user:', user.email);

    // Step 1: Verify BVN
    console.log('📋 Step 1: Verifying BVN...');
    const bvnResult = await bvnVerificationService.verifyBVN(bvn, {
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phone
    });

    if (!bvnResult.verified) {
      return res.status(400).json({
        status: 'error',
        message: 'BVN verification failed',
        details: bvnResult
      });
    }

    // Step 2: Verify bank account
    console.log('🏦 Step 2: Verifying bank account...');
    const bankResult = await bankVerificationService.verifyAccount(
      bankAccount.accountNumber,
      bankAccount.bankCode,
      bankAccount.accountName
    );

    if (!bankResult.verified) {
      return res.status(400).json({
        status: 'error',
        message: 'Bank account verification failed',
        details: bankResult
      });
    }

    // Step 3: Update user KYC data
    console.log('💾 Step 3: Updating user KYC data...');
    user.kycData.bvn = {
      number: bvn,
      verified: true,
      verificationResult: bvnResult,
      verifiedAt: new Date()
    };

    user.kycData.bankAccount = {
      accountNumber: bankAccount.accountNumber,
      bankCode: bankAccount.bankCode,
      bankName: bankResult.accountResult.bankName,
      accountName: bankAccount.accountName,
      verified: true,
      verificationResult: bankResult,
      verifiedAt: new Date()
    };

    user.kycData.submittedAt = new Date();

    // Step 4: Check if all KYC requirements are met
    const hasDocumentUpload = user.documentImage && user.liveFaceImage;
    const hasFaceVerification = user.verificationScore >= 70 && user.kycVerificationDetails.livenessCheckPassed;
    const hasBVNVerification = bvnResult.verified;
    const hasBankVerification = bankResult.verified;

    if (hasDocumentUpload && hasFaceVerification && hasBVNVerification && hasBankVerification) {
      user.kycStatus = 'verified';
      user.kycVerified = true;
      user.kycData.reviewedAt = new Date();
      
      console.log('✅ KYC verification completed successfully');
    } else {
      user.kycStatus = 'pending';
      console.log('⏳ KYC verification pending - missing requirements');
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'KYC verification completed successfully',
      data: {
        kycStatus: user.kycStatus,
        kycVerified: user.kycVerified,
        verificationResults: {
          bvn: bvnResult,
          bankAccount: bankResult,
          faceVerification: {
            score: user.verificationScore,
            livenessPassed: user.kycVerificationDetails.livenessCheckPassed
          }
        },
        requirements: {
          documentUpload: hasDocumentUpload,
          faceVerification: hasFaceVerification,
          bvnVerification: hasBVNVerification,
          bankVerification: hasBankVerification
        }
      }
    });

  } catch (error) {
    console.error('❌ Complete KYC verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete KYC verification',
      error: error.message
    });
  }
});

// @desc    Get list of supported banks
// @route   GET /api/kyc/banks
// @access  Private
router.get('/banks', protect, async (req, res) => {
  try {
    const banks = await bankVerificationService.getBanks();
    
    res.status(200).json({
      status: 'success',
      data: banks
    });
  } catch (error) {
    console.error('❌ Error fetching banks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch banks list',
      error: error.message
    });
  }
});

// @desc    Verify BVN only
// @route   POST /api/kyc/verify-bvn
// @access  Private
router.post('/verify-bvn', protect, async (req, res) => {
  try {
    const { bvn } = req.body;

    if (!bvn) {
      return res.status(400).json({
        status: 'error',
        message: 'BVN is required'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const bvnResult = await bvnVerificationService.verifyBVN(bvn, {
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phone
    });

    res.status(200).json({
      status: 'success',
      message: 'BVN verification completed',
      data: bvnResult
    });

  } catch (error) {
    console.error('❌ BVN verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'BVN verification failed',
      error: error.message
    });
  }
});

// @desc    Verify bank account only
// @route   POST /api/kyc/verify-bank-account
// @access  Private
router.post('/verify-bank-account', protect, async (req, res) => {
  try {
    const { accountNumber, bankCode, accountName } = req.body;

    if (!accountNumber || !bankCode || !accountName) {
      return res.status(400).json({
        status: 'error',
        message: 'Account number, bank code, and account name are required'
      });
    }

    const bankResult = await bankVerificationService.verifyAccount(
      accountNumber,
      bankCode,
      accountName
    );

    res.status(200).json({
      status: 'success',
      message: 'Bank account verification completed',
      data: bankResult
    });

  } catch (error) {
    console.error('❌ Bank account verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Bank account verification failed',
      error: error.message
    });
  }
});

module.exports = router;
