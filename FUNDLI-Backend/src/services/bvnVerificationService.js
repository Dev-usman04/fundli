const axios = require('axios');

class BVNVerificationService {
  constructor() {
    // Load environment variables
    require('dotenv').config();
    
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseURL = 'https://api.paystack.co';
    
    if (!this.secretKey) {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not found. BVN verification will be disabled.');
      this.disabled = true;
    } else {
      console.log('✅ BVN Verification Service initialized with real Paystack API');
      this.disabled = false;
    }
  }

  /**
   * Get headers for Paystack API requests
   */
  getHeaders() {
    if (this.disabled) {
      throw new Error('BVN verification is disabled. Please configure PAYSTACK_SECRET_KEY.');
    }
    return {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Verify BVN using Paystack API
   * @param {string} bvn - Bank Verification Number
   * @param {Object} userDetails - User details for verification
   * @returns {Object} Verification result
   */
  async verifyBVN(bvn, userDetails = {}) {
    try {
      // Always use real Paystack API - no mock data
      if (this.disabled) {
        throw new Error('BVN verification service is disabled. Please configure PAYSTACK_SECRET_KEY environment variable.');
      }

      console.log('🔍 Verifying BVN:', bvn.substring(0, 3) + '***' + bvn.substring(6));

      // Paystack BVN verification endpoint
      const response = await axios.get(`${this.baseURL}/bank/resolve_bvn/${bvn}`, {
        headers: this.getHeaders()
      });

      if (response.data.status === true) {
        const bvnData = response.data.data;
        
        // Validate BVN data
        const verificationResult = {
          verified: true,
          bvn: bvnData.bvn,
          firstName: bvnData.first_name,
          lastName: bvnData.last_name,
          middleName: bvnData.middle_name,
          dateOfBirth: bvnData.date_of_birth,
          phoneNumber: bvnData.phone_number,
          registrationDate: bvnData.registration_date,
          enrollmentBank: bvnData.enrollment_bank,
          enrollmentBranch: bvnData.enrollment_branch,
          image: bvnData.image,
          isBlacklisted: bvnData.is_blacklisted || false,
          verificationDate: new Date(),
          source: 'paystack'
        };

        // Cross-reference with user details if provided
        if (userDetails.firstName && userDetails.lastName) {
          const nameMatch = this.compareNames(
            `${bvnData.first_name} ${bvnData.last_name}`.toLowerCase(),
            `${userDetails.firstName} ${userDetails.lastName}`.toLowerCase()
          );
          verificationResult.nameMatch = nameMatch;
        }

        if (userDetails.phoneNumber) {
          verificationResult.phoneMatch = this.comparePhoneNumbers(
            bvnData.phone_number,
            userDetails.phoneNumber
          );
        }

        console.log('✅ BVN verification successful');
        return verificationResult;
      } else {
        throw new Error(response.data.message || 'BVN verification failed');
      }

    } catch (error) {
      console.error('❌ BVN verification error:', error.response?.data || error.message);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        throw new Error('Invalid BVN format or BVN not found');
      } else if (error.response?.status === 401) {
        throw new Error('BVN verification service authentication failed');
      } else if (error.response?.status === 429) {
        throw new Error('BVN verification rate limit exceeded. Please try again later.');
      } else {
        throw new Error('BVN verification service temporarily unavailable');
      }
    }
  }

  /**
   * Verify BVN with bank account details
   * @param {string} bvn - Bank Verification Number
   * @param {string} accountNumber - Bank account number
   * @param {string} bankCode - Bank code
   * @returns {Object} Verification result
   */
  async verifyBVNWithAccount(bvn, accountNumber, bankCode) {
    try {
      // Always use real Paystack API - no mock data
      if (this.disabled) {
        throw new Error('BVN verification service is disabled. Please configure PAYSTACK_SECRET_KEY environment variable.');
      }

      console.log('🔍 Verifying BVN with account details');

      // First verify BVN
      const bvnResult = await this.verifyBVN(bvn);
      
      if (!bvnResult.verified) {
        return {
          verified: false,
          error: 'BVN verification failed',
          bvnResult
        };
      }

      // Then verify bank account
      const accountResponse = await axios.get(
        `${this.baseURL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: this.getHeaders()
        }
      );

      if (accountResponse.data.status === true) {
        const accountData = accountResponse.data.data;
        
        return {
          verified: true,
          bvnResult,
          accountResult: {
            accountNumber: accountData.account_number,
            accountName: accountData.account_name,
            bankCode: accountData.bank_code,
            bankName: accountData.bank_name
          },
          verificationDate: new Date(),
          source: 'paystack'
        };
      } else {
        return {
          verified: false,
          error: 'Bank account verification failed',
          bvnResult
        };
      }

    } catch (error) {
      console.error('❌ BVN with account verification error:', error.response?.data || error.message);
      throw new Error('BVN and account verification failed');
    }
  }

  /**
   * Compare names for verification
   * @param {string} bvnName - Name from BVN
   * @param {string} userName - Name from user input
   * @returns {boolean} Whether names match
   */
  compareNames(bvnName, userName) {
    // Remove extra spaces and convert to lowercase
    const cleanBvnName = bvnName.replace(/\s+/g, ' ').trim();
    const cleanUserName = userName.replace(/\s+/g, ' ').trim();
    
    // Check for exact match
    if (cleanBvnName === cleanUserName) {
      return true;
    }
    
    // Check for partial match (first name and last name)
    const bvnParts = cleanBvnName.split(' ');
    const userParts = cleanUserName.split(' ');
    
    if (bvnParts.length >= 2 && userParts.length >= 2) {
      const bvnFirstLast = `${bvnParts[0]} ${bvnParts[bvnParts.length - 1]}`;
      const userFirstLast = `${userParts[0]} ${userParts[userParts.length - 1]}`;
      
      return bvnFirstLast === userFirstLast;
    }
    
    return false;
  }

  /**
   * Compare phone numbers for verification
   * @param {string} bvnPhone - Phone from BVN
   * @param {string} userPhone - Phone from user input
   * @returns {boolean} Whether phones match
   */
  comparePhoneNumbers(bvnPhone, userPhone) {
    // Normalize phone numbers (remove spaces, dashes, country codes)
    const normalizePhone = (phone) => {
      return phone.replace(/[\s\-\(\)]/g, '').replace(/^\+234/, '0').replace(/^234/, '0');
    };
    
    const normalizedBvnPhone = normalizePhone(bvnPhone);
    const normalizedUserPhone = normalizePhone(userPhone);
    
    return normalizedBvnPhone === normalizedUserPhone;
  }

  /**
   * Get mock BVN result for development/testing
   * @param {string} bvn - BVN number
   * @param {Object} userDetails - User details
   * @returns {Object} Mock verification result
   */
  getMockBVNResult(bvn, userDetails) {
    console.log('🧪 Using mock BVN verification for development');
    
    // Validate BVN format (11 digits)
    if (!/^\d{11}$/.test(bvn)) {
      throw new Error('Invalid BVN format. BVN must be 11 digits.');
    }

    return {
      verified: true,
      bvn: bvn,
      firstName: userDetails.firstName || 'John',
      lastName: userDetails.lastName || 'Doe',
      middleName: userDetails.middleName || 'Michael',
      dateOfBirth: userDetails.dateOfBirth || '1990-01-01',
      phoneNumber: userDetails.phoneNumber || '08012345678',
      registrationDate: '2015-01-01',
      enrollmentBank: 'First Bank of Nigeria',
      enrollmentBranch: 'Lagos Main Branch',
      image: null,
      isBlacklisted: false,
      verificationDate: new Date(),
      source: 'mock',
      nameMatch: true,
      phoneMatch: true
    };
  }

  /**
   * Get mock BVN with account result for development
   * @param {string} bvn - BVN number
   * @param {string} accountNumber - Account number
   * @param {string} bankCode - Bank code
   * @returns {Object} Mock verification result
   */
  getMockBVNAccountResult(bvn, accountNumber, bankCode) {
    console.log('🧪 Using mock BVN with account verification for development');
    
    return {
      verified: true,
      bvnResult: this.getMockBVNResult(bvn, { firstName: 'John', lastName: 'Doe' }),
      accountResult: {
        accountNumber: accountNumber,
        accountName: 'John Doe Michael',
        bankCode: bankCode,
        bankName: 'First Bank of Nigeria'
      },
      verificationDate: new Date(),
      source: 'mock'
    };
  }

  /**
   * Validate BVN format
   * @param {string} bvn - BVN to validate
   * @returns {boolean} Whether BVN format is valid
   */
  validateBVNFormat(bvn) {
    // Nigerian BVN is 11 digits
    return /^\d{11}$/.test(bvn);
  }

  /**
   * Get BVN verification configuration
   * @returns {Object} Configuration settings
   */
  getConfig() {
    return {
      enabled: !this.disabled,
      baseURL: this.baseURL,
      supportedFormats: ['11-digit number'],
      rateLimit: {
        requests: 100,
        window: '1 hour'
      }
    };
  }
}

// Create singleton instance
const bvnVerificationService = new BVNVerificationService();

module.exports = { bvnVerificationService };
