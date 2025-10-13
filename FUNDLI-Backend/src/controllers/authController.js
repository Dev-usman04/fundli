const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const emailService = require('../services/emailService');

// Generate JWT Token
const generateToken = (id, userType) => {
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, userType, company, referralCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      userType,
      company
    });

    // Handle referral code if provided
    if (referralCode) {
      try {
        const ReferralService = require('../services/referralService');
        await ReferralService.createReferral(referralCode, user._id);
        
        // Update user to show they were referred
        user.referredBy = referralCode;
        await user.save();
      } catch (referralError) {
        console.warn('Referral code error:', referralError.message);
        // Don't fail registration if referral fails
      }
    }

    // Generate OTP
    const otp = generateOTP();
    user.emailVerificationToken = otp;
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send OTP email
    await emailService.sendOTPEmail(email, otp, firstName);

    // Send notification to admins about new user registration
    try {
      const NotificationService = require('../services/notificationService');
      
      await NotificationService.notifyAdminNewUserRegistration({
        userId: user._id,
        userType: user.userType,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email
      });
      
      console.log(`📧 New user registration notification sent to admins for ${user.userType}: ${user.email}`);
    } catch (notificationError) {
      console.error('Error sending admin new user notification:', notificationError);
      // Don't fail registration if notifications fail
    }

    // Generate tokens
    const accessToken = generateToken(user._id, user.userType);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please check your email for OTP verification.',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          userType: user.userType,
          kycStatus: user.kycStatus,
          isEmailVerified: user.isEmailVerified,
          referralCode: user.referralCode
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for email:', email);
    console.log('Password provided:', password ? 'Yes' : 'No');

    // Check database connection first
    if (mongoose.connection.readyState !== 1) {
      console.log('Database not connected, using mock user for testing');
      
      // Mock user for testing when database is not available
      if (email.toLowerCase() === 'focussoliu@gmail.com' && password === 'TestPassword123!') {
        console.log('✅ Mock login successful for test user');
        
        const mockUser = {
          id: 'mock-user-id',
          firstName: 'Focus',
          lastName: 'Soliu',
          email: 'Focussoliu@gmail.com',
          userType: 'borrower',
          kycStatus: 'pending',
          isEmailVerified: true,
          isPhoneVerified: false
        };
        
        const accessToken = generateToken(mockUser.id, mockUser.userType);
        const refreshToken = generateRefreshToken(mockUser.id);
        
        return res.status(200).json({
          status: 'success',
          message: 'Login successful (mock user)',
          data: {
            user: mockUser,
            accessToken,
            refreshToken
          }
        });
      } else {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials (database unavailable - using mock system)'
        });
      }
    }

    // Check if user exists with timeout
    const user = await Promise.race([
      User.findOne({ email }).select('+password'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ]);
    
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    console.log('User found:', user.email);
    console.log('User password field exists:', !!user.password);
    console.log('User isEmailVerified:', user.isEmailVerified);
    console.log('User kycStatus:', user.kycStatus);

    // Check if account is locked
    if (user.isLocked) {
      console.log('Account is locked for user:', user.email);
      return res.status(423).json({
        status: 'error',
        message: 'Account is locked due to multiple failed login attempts. Please try again later.'
      });
    }

    // Check if password matches with timeout
    console.log('Attempting to compare password...');
    const isMatch = await Promise.race([
      user.comparePassword(password),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Password comparison timeout')), 3000)
      )
    ]);
    console.log('Password comparison result:', isMatch);
    
    if (!isMatch) {
      console.log('Password mismatch for user:', user.email);
      // Increment login attempts
      await user.incrementLoginAttempts();
      
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    console.log('Password verified successfully for user:', user.email);

    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Check if email is verified OR if KYC is completed
    // Allow login for newly registered users who haven't completed email verification yet
    if (!user.isEmailVerified && user.kycStatus === 'pending' && user.createdAt > Date.now() - 24 * 60 * 60 * 1000) {
      // Allow login for users registered within the last 24 hours (still in registration flow)
      console.log('Allowing login for newly registered user:', user.email);
    } else if (!user.isEmailVerified && user.kycStatus === 'pending') {
      return res.status(401).json({
        status: 'error',
        message: 'Please verify your email or complete KYC verification before logging in'
      });
    }

    // Generate tokens
    const accessToken = generateToken(user._id, user.userType);
    const refreshToken = generateRefreshToken(user._id);

    console.log('Login controller - User found:', user.email);
    console.log('Login controller - User userType:', user.userType);
    console.log('Login controller - User userType type:', typeof user.userType);
    console.log('Login controller - Preparing response...');

    const responseData = {
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          userType: user.userType,
          kycStatus: user.kycStatus,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified
        },
        accessToken,
        refreshToken
      }
    };

    console.log('Login controller - Response data:', responseData);
    console.log('Login controller - Response userType:', responseData.data.user.userType);

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: error.message
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if OTP is valid
    if (user.emailVerificationToken !== otp) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid OTP'
      });
    }

    // Check if OTP has expired
    if (Date.now() > user.emailVerificationExpires) {
      return res.status(400).json({
        status: 'error',
        message: 'OTP has expired'
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Generate new token
    const token = generateToken(user._id, user.userType);

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          userType: user.userType,
          kycStatus: user.kycStatus,
          isEmailVerified: user.isEmailVerified
        },
        token
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'OTP verification failed',
      error: error.message
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    user.emailVerificationToken = otp;
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send new OTP email
    await emailService.sendOTPEmail(email, otp, user.firstName);

    res.status(200).json({
      status: 'success',
      message: 'OTP resent successfully'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to resend OTP',
      error: error.message
    });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id, user.userType);
    const newRefreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      status: 'error',
      message: 'Invalid refresh token',
      error: error.message
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send password reset email
    await emailService.sendPasswordResetEmail(email, user.firstName, resetToken);

    res.status(200).json({
      status: 'success',
      message: 'Password reset email sent successfully'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send password reset email',
      error: error.message
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Find user by reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Password reset failed',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Password change failed',
      error: error.message
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return a success message
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Logout failed',
      error: error.message
    });
  }
};

// Get current user profile
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile'
    });
  }
};

module.exports = {
  register,
  login,
  verifyOTP,
  resendOTP,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
  getMe
}; 