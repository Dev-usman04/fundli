const axios = require('axios');

class BankVerificationService {
  constructor() {
    // Load environment variables
    require('dotenv').config();
    
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseURL = 'https://api.paystack.co';
    
    if (!this.secretKey) {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not found. Bank verification will be disabled.');
      this.disabled = true;
    } else {
      console.log('✅ Bank Verification Service initialized with real Paystack API');
      this.disabled = false;
    }
  }

  /**
   * Get headers for Paystack API requests
   */
  getHeaders() {
    if (this.disabled) {
      throw new Error('Bank verification is disabled. Please configure PAYSTACK_SECRET_KEY.');
    }
    return {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get list of supported banks
   * @returns {Array} List of banks with codes and names
   */
  async getBanks() {
    try {
      // Always use real Paystack API - no mock data
      if (this.disabled) {
        throw new Error('Bank verification service is disabled. Please configure PAYSTACK_SECRET_KEY environment variable.');
      }

      console.log('🏦 Fetching list of banks...');

      const response = await axios.get(`${this.baseURL}/bank`, {
        headers: this.getHeaders()
      });

      if (response.data.status === true) {
        const banks = response.data.data.map(bank => ({
          code: bank.code,
          name: bank.name,
          longcode: bank.longcode,
          gateway: bank.gateway,
          pay_with_bank: bank.pay_with_bank,
          active: bank.active,
          is_deleted: bank.is_deleted,
          country: bank.country,
          currency: bank.currency,
          type: bank.type
        }));

        console.log(`✅ Retrieved ${banks.length} banks`);
        return banks;
      } else {
        throw new Error('Failed to fetch banks list');
      }

    } catch (error) {
      console.error('❌ Error fetching banks:', error.response?.data || error.message);
      throw new Error('Failed to fetch banks from Paystack API');
    }
  }

  /**
   * Resolve bank account details
   * @param {string} accountNumber - Bank account number
   * @param {string} bankCode - Bank code
   * @returns {Object} Account verification result
   */
  async resolveAccount(accountNumber, bankCode) {
    try {
      // Always use real Paystack API - no mock data
      if (this.disabled) {
        throw new Error('Bank verification service is disabled. Please configure PAYSTACK_SECRET_KEY environment variable.');
      }

      console.log('🔍 Resolving bank account:', accountNumber.substring(0, 3) + '***' + accountNumber.substring(6));

      const response = await axios.get(
        `${this.baseURL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: this.getHeaders()
        }
      );

      if (response.data.status === true) {
        const accountData = response.data.data;
        
        const verificationResult = {
          verified: true,
          accountNumber: accountData.account_number,
          accountName: accountData.account_name,
          bankCode: accountData.bank_code,
          bankName: accountData.bank_name,
          verificationDate: new Date(),
          source: 'paystack'
        };

        console.log('✅ Bank account resolved successfully');
        return verificationResult;
      } else {
        throw new Error(response.data.message || 'Account resolution failed');
      }

    } catch (error) {
      console.error('❌ Bank account resolution error:', error.response?.data || error.message);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        throw new Error('Invalid account number or bank code');
      } else if (error.response?.status === 401) {
        throw new Error('Bank verification service authentication failed');
      } else if (error.response?.status === 404) {
        throw new Error('Account not found or bank code invalid');
      } else if (error.response?.status === 429) {
        throw new Error('Bank verification rate limit exceeded. Please try again later.');
      } else {
        throw new Error('Bank verification service temporarily unavailable');
      }
    }
  }

  /**
   * Verify bank account with user details
   * @param {string} accountNumber - Bank account number
   * @param {string} bankCode - Bank code
   * @param {string} accountName - Expected account name
   * @returns {Object} Verification result with name matching
   */
  async verifyAccount(accountNumber, bankCode, accountName) {
    try {
      // First resolve the account
      const accountResult = await this.resolveAccount(accountNumber, bankCode);
      
      if (!accountResult.verified) {
        return {
          verified: false,
          error: 'Account resolution failed',
          accountResult
        };
      }

      // Check if account name matches
      const nameMatch = this.compareAccountNames(accountResult.accountName, accountName);
      
      return {
        verified: nameMatch,
        accountResult,
        nameMatch,
        expectedName: accountName,
        actualName: accountResult.accountName,
        verificationDate: new Date()
      };

    } catch (error) {
      console.error('❌ Bank account verification error:', error.message);
      throw error;
    }
  }

  /**
   * Compare account names for verification
   * @param {string} bankAccountName - Name from bank
   * @param {string} userAccountName - Name from user input
   * @returns {boolean} Whether names match
   */
  compareAccountNames(bankAccountName, userAccountName) {
    if (!bankAccountName || !userAccountName) {
      return false;
    }

    // Normalize names (remove extra spaces, convert to lowercase)
    const normalizeName = (name) => {
      return name.replace(/\s+/g, ' ').trim().toLowerCase();
    };

    const normalizedBankName = normalizeName(bankAccountName);
    const normalizedUserName = normalizeName(userAccountName);

    // Check for exact match
    if (normalizedBankName === normalizedUserName) {
      return true;
    }

    // Check for partial match (first name and last name)
    const bankParts = normalizedBankName.split(' ');
    const userParts = normalizedUserName.split(' ');

    if (bankParts.length >= 2 && userParts.length >= 2) {
      const bankFirstLast = `${bankParts[0]} ${bankParts[bankParts.length - 1]}`;
      const userFirstLast = `${userParts[0]} ${userParts[userParts.length - 1]}`;
      
      return bankFirstLast === userFirstLast;
    }

    // Check for individual name matches
    const bankNameSet = new Set(bankParts);
    const userNameSet = new Set(userParts);
    
    // If at least 2 names match, consider it a match
    const commonNames = [...bankNameSet].filter(name => userNameSet.has(name));
    return commonNames.length >= 2;
  }

  /**
   * Validate account number format
   * @param {string} accountNumber - Account number to validate
   * @param {string} bankCode - Bank code for validation
   * @returns {boolean} Whether account number format is valid
   */
  validateAccountNumber(accountNumber, bankCode) {
    // Basic validation - account number should be 10 digits for most Nigerian banks
    if (!/^\d{10}$/.test(accountNumber)) {
      return false;
    }

    // Additional validation based on bank code
    const bankValidations = {
      '058': /^\d{10}$/, // GTBank
      '011': /^\d{10}$/, // First Bank
      '214': /^\d{10}$/, // First City Monument Bank
      '070': /^\d{10}$/, // Fidelity Bank
      '023': /^\d{10}$/, // Sterling Bank
      '050': /^\d{10}$/, // Ecobank
      '221': /^\d{10}$/, // Stanbic IBTC
      '068': /^\d{10}$/, // Standard Chartered
      '232': /^\d{10}$/, // Sterling Bank
      '033': /^\d{10}$/, // United Bank for Africa
      '215': /^\d{10}$/, // Unity Bank
      '035': /^\d{10}$/, // Wema Bank
      '057': /^\d{10}$/, // Zenith Bank
      '032': /^\d{10}$/, // Union Bank
      '044': /^\d{10}$/, // Access Bank
      '014': /^\d{10}$/, // Afribank
      '063': /^\d{10}$/, // Access Bank (Diamond)
      '030': /^\d{10}$/, // Heritage Bank
      '301': /^\d{10}$/, // Jaiz Bank
      '082': /^\d{10}$/, // Keystone Bank
      '221': /^\d{10}$/, // Stanbic IBTC Bank
      '068': /^\d{10}$/, // Standard Chartered Bank
      '232': /^\d{10}$/, // Sterling Bank
      '000': /^\d{10}$/, // Suntrust Bank
      '032': /^\d{10}$/, // Union Bank of Nigeria
      '033': /^\d{10}$/, // United Bank For Africa
      '215': /^\d{10}$/, // Unity Bank
      '035': /^\d{10}$/, // Wema Bank
      '057': /^\d{10}$/, // Zenith Bank
    };

    const validation = bankValidations[bankCode];
    return validation ? validation.test(accountNumber) : /^\d{10}$/.test(accountNumber);
  }

  /**
   * Get mock banks for development/testing
   * @returns {Array} Mock banks list
   */
  getMockBanks() {
    console.log('🧪 Using mock banks list for development');
    
    return [
      { code: '058', name: 'Guaranty Trust Bank', longcode: '058152036', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '011', name: 'First Bank of Nigeria', longcode: '011151003', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '214', name: 'First City Monument Bank', longcode: '214150018', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '070', name: 'Fidelity Bank', longcode: '070150003', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '023', name: 'Sterling Bank', longcode: '023150005', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '050', name: 'Ecobank Nigeria', longcode: '050150010', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '221', name: 'Stanbic IBTC Bank', longcode: '221159022', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '068', name: 'Standard Chartered Bank', longcode: '068150015', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '232', name: 'Sterling Bank', longcode: '232150016', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '033', name: 'United Bank for Africa', longcode: '033151006', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '215', name: 'Unity Bank', longcode: '215154097', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '035', name: 'Wema Bank', longcode: '035150103', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '057', name: 'Zenith Bank', longcode: '057150013', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '032', name: 'Union Bank of Nigeria', longcode: '032080474', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' },
      { code: '044', name: 'Access Bank', longcode: '044150149', gateway: 'emandate', pay_with_bank: false, active: true, is_deleted: false, country: 'Nigeria', currency: 'NGN', type: 'nuban' }
    ];
  }

  /**
   * Get mock account result for development
   * @param {string} accountNumber - Account number
   * @param {string} bankCode - Bank code
   * @returns {Object} Mock account verification result
   */
  getMockAccountResult(accountNumber, bankCode) {
    console.log('🧪 Using mock bank account verification for development');
    
    // Validate account number format
    if (!this.validateAccountNumber(accountNumber, bankCode)) {
      throw new Error('Invalid account number format');
    }

    const bankNames = {
      '058': 'Guaranty Trust Bank',
      '011': 'First Bank of Nigeria',
      '214': 'First City Monument Bank',
      '070': 'Fidelity Bank',
      '023': 'Sterling Bank',
      '050': 'Ecobank Nigeria',
      '221': 'Stanbic IBTC Bank',
      '068': 'Standard Chartered Bank',
      '232': 'Sterling Bank',
      '033': 'United Bank for Africa',
      '215': 'Unity Bank',
      '035': 'Wema Bank',
      '057': 'Zenith Bank',
      '032': 'Union Bank of Nigeria',
      '044': 'Access Bank'
    };

    return {
      verified: true,
      accountNumber: accountNumber,
      accountName: 'John Doe Michael',
      bankCode: bankCode,
      bankName: bankNames[bankCode] || 'Unknown Bank',
      verificationDate: new Date(),
      source: 'mock'
    };
  }

  /**
   * Get bank verification configuration
   * @returns {Object} Configuration settings
   */
  getConfig() {
    return {
      enabled: !this.disabled,
      baseURL: this.baseURL,
      supportedFormats: ['10-digit account number'],
      rateLimit: {
        requests: 100,
        window: '1 hour'
      }
    };
  }
}

// Create singleton instance
const bankVerificationService = new BankVerificationService();

module.exports = { bankVerificationService };
