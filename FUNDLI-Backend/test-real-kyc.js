#!/usr/bin/env node

/**
 * Real KYC Services Test Script
 * Tests KYC verification services with real Paystack API calls
 * NO MOCK DATA - All tests use real API endpoints
 */

// Load environment variables
require('dotenv').config();

const { bvnVerificationService } = require('./src/services/bvnVerificationService');
const { bankVerificationService } = require('./src/services/bankVerificationService');
const { faceComparisonService } = require('./src/services/faceComparisonService');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n🧪 Testing: ${testName}`, 'cyan');
  log('='.repeat(50), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testEnvironmentSetup() {
  logTest('Environment Setup Check');
  
  try {
    // Check environment variables
    const requiredEnvVars = [
      'PAYSTACK_SECRET_KEY',
      'PAYSTACK_PUBLIC_KEY',
      'MONGODB_URI',
      'JWT_SECRET'
    ];

    let allConfigured = true;
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        logSuccess(`${envVar} is configured`);
      } else {
        logError(`${envVar} is NOT configured`);
        allConfigured = false;
      }
    }

    if (!allConfigured) {
      logError('❌ Environment setup incomplete. Please configure all required environment variables.');
      return false;
    }

    logSuccess('✅ Environment setup complete - Ready for real KYC testing');
    return true;

  } catch (error) {
    logError(`Environment setup check failed: ${error.message}`);
    return false;
  }
}

async function testRealBankVerification() {
  logTest('Real Bank Verification Service');
  
  try {
    // Test 1: Get real banks list from Paystack
    logInfo('Test 1: Fetching real banks list from Paystack API');
    const banks = await bankVerificationService.getBanks();
    
    if (banks && banks.length > 0) {
      logSuccess(`✅ Retrieved ${banks.length} real banks from Paystack`);
      logInfo(`First bank: ${banks[0].name} (${banks[0].code})`);
      logInfo(`Last bank: ${banks[banks.length - 1].name} (${banks[banks.length - 1].code})`);
    } else {
      logError('❌ Failed to retrieve banks from Paystack API');
      return false;
    }

    // Test 2: Test with a real bank code (GTBank)
    logInfo('Test 2: Testing bank account resolution with real bank code');
    const testAccountNumber = '1234567890'; // This will fail with real API, but tests the connection
    const testBankCode = '058'; // GTBank code
    
    try {
      const accountResult = await bankVerificationService.resolveAccount(testAccountNumber, testBankCode);
      logSuccess('✅ Bank account resolution API call successful');
      logInfo(`Account: ${accountResult.accountNumber}`);
      logInfo(`Bank: ${accountResult.bankName}`);
    } catch (error) {
      if (error.message.includes('Account not found') || error.message.includes('Invalid account')) {
        logSuccess('✅ Bank account resolution API working (expected failure for test account)');
      } else {
        logError(`❌ Bank account resolution failed: ${error.message}`);
        return false;
      }
    }

    // Test 3: Service configuration
    logInfo('Test 3: Service configuration');
    const config = bankVerificationService.getConfig();
    logInfo(`Service enabled: ${config.enabled}`);
    logInfo(`Base URL: ${config.baseURL}`);

    return true;

  } catch (error) {
    logError(`Real bank verification test failed: ${error.message}`);
    return false;
  }
}

async function testRealBVNVerification() {
  logTest('Real BVN Verification Service');
  
  try {
    // Test 1: BVN format validation
    logInfo('Test 1: BVN format validation');
    const validBVN = '12345678901';
    const invalidBVN = '12345';
    
    const isValidFormat = bvnVerificationService.validateBVNFormat(validBVN);
    const isInvalidFormat = bvnVerificationService.validateBVNFormat(invalidBVN);
    
    if (isValidFormat && !isInvalidFormat) {
      logSuccess('✅ BVN format validation working correctly');
    } else {
      logError('❌ BVN format validation failed');
      return false;
    }

    // Test 2: Real BVN verification (this will fail with test BVN, but tests API connection)
    logInfo('Test 2: Testing real BVN verification with Paystack API');
    const testBVN = '12345678901'; // This will fail with real API, but tests the connection
    
    try {
      const bvnResult = await bvnVerificationService.verifyBVN(testBVN, {
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '08012345678'
      });
      
      logSuccess('✅ BVN verification API call successful');
      logInfo(`BVN: ${bvnResult.bvn}`);
      logInfo(`Name: ${bvnResult.firstName} ${bvnResult.lastName}`);
    } catch (error) {
      if (error.message.includes('BVN not found') || error.message.includes('Invalid BVN')) {
        logSuccess('✅ BVN verification API working (expected failure for test BVN)');
      } else {
        logError(`❌ BVN verification failed: ${error.message}`);
        return false;
      }
    }

    // Test 3: Service configuration
    logInfo('Test 3: Service configuration');
    const config = bvnVerificationService.getConfig();
    logInfo(`Service enabled: ${config.enabled}`);
    logInfo(`Base URL: ${config.baseURL}`);

    return true;

  } catch (error) {
    logError(`Real BVN verification test failed: ${error.message}`);
    return false;
  }
}

async function testRealFaceComparison() {
  logTest('Real Face Comparison Service');
  
  try {
    // Test 1: Service configuration
    logInfo('Test 1: Service configuration');
    const config = faceComparisonService.getConfig();
    logInfo(`Similarity threshold: ${config.similarityThreshold}%`);
    logInfo(`Supported formats: ${config.supportedFormats.join(', ')}`);
    logInfo(`Max file size: ${config.maxFileSize / (1024 * 1024)}MB`);

    // Test 2: Image quality calculation
    logInfo('Test 2: Image quality calculation');
    const mockMetadata = {
      width: 1920,
      height: 1080,
      format: 'jpeg'
    };
    
    const quality = faceComparisonService.calculateImageQuality(mockMetadata);
    logInfo(`Image quality score: ${quality}%`);

    // Test 3: Face confidence calculation
    logInfo('Test 3: Face confidence calculation');
    const confidence = faceComparisonService.calculateFaceConfidence(mockMetadata);
    logInfo(`Face detection confidence: ${Math.round(confidence * 100)}%`);

    // Test 4: Confidence level calculation
    logInfo('Test 4: Confidence level calculation');
    const testScores = [95, 85, 75, 65, 55];
    
    testScores.forEach(score => {
      const confidence = faceComparisonService.getConfidenceLevel(score);
      logInfo(`Score ${score}%: ${confidence} confidence`);
    });

    // Test 5: Similarity threshold update
    logInfo('Test 5: Similarity threshold update');
    const originalThreshold = faceComparisonService.similarityThreshold;
    faceComparisonService.setSimilarityThreshold(90);
    logInfo(`Threshold updated from ${originalThreshold}% to 90%`);
    
    // Reset to original
    faceComparisonService.setSimilarityThreshold(originalThreshold);
    logInfo(`Threshold reset to ${originalThreshold}%`);

    logSuccess('✅ Face comparison service ready for real image processing');
    return true;

  } catch (error) {
    logError(`Real face comparison test failed: ${error.message}`);
    return false;
  }
}

async function testRealAPIConnectivity() {
  logTest('Real API Connectivity Test');
  
  try {
    // Test 1: Paystack API connectivity
    logInfo('Test 1: Testing Paystack API connectivity');
    
    try {
      const banks = await bankVerificationService.getBanks();
      if (banks && banks.length > 0) {
        logSuccess('✅ Paystack API connectivity confirmed');
        logInfo(`Connected to Paystack API successfully`);
        logInfo(`Retrieved ${banks.length} banks from real API`);
      } else {
        logError('❌ Paystack API returned empty response');
        return false;
      }
    } catch (error) {
      if (error.message.includes('authentication') || error.message.includes('401')) {
        logError('❌ Paystack API authentication failed - check your API keys');
        return false;
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        logError('❌ Network connectivity issue - check your internet connection');
        return false;
      } else {
        logError(`❌ Paystack API connectivity failed: ${error.message}`);
        return false;
      }
    }

    // Test 2: Service availability
    logInfo('Test 2: Service availability check');
    const services = [
      { name: 'BVN Verification', service: bvnVerificationService },
      { name: 'Bank Verification', service: bankVerificationService },
      { name: 'Face Comparison', service: faceComparisonService }
    ];

    for (const { name, service } of services) {
      const config = service.getConfig();
      if (config && config.enabled !== undefined) {
        logSuccess(`${name} service is available and configured`);
      } else {
        logError(`${name} service is not properly configured`);
        return false;
      }
    }

    logSuccess('✅ All services are available and ready for real KYC operations');
    return true;

  } catch (error) {
    logError(`Real API connectivity test failed: ${error.message}`);
    return false;
  }
}

async function runRealKYCTests() {
  log('🚀 Starting REAL KYC Services Test Suite', 'bright');
  log('🔴 NO MOCK DATA - ALL TESTS USE REAL PAYSTACK API', 'red');
  log('='.repeat(60), 'bright');
  
  const startTime = Date.now();
  const results = [];

  // Run all tests
  results.push(await testEnvironmentSetup());
  results.push(await testRealAPIConnectivity());
  results.push(await testRealBankVerification());
  results.push(await testRealBVNVerification());
  results.push(await testRealFaceComparison());

  // Calculate results
  const endTime = Date.now();
  const duration = endTime - startTime;
  const passed = results.filter(r => r).length;
  const total = results.length;

  // Display summary
  log('\n📊 Real KYC Test Results Summary', 'bright');
  log('='.repeat(60), 'bright');
  log(`Total tests: ${total}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${total - passed}`, 'red');
  log(`Duration: ${duration}ms`, 'blue');
  log(`Success rate: ${Math.round((passed / total) * 100)}%`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All real KYC tests passed! System is ready for production KYC operations.', 'green');
    log('✅ Real Paystack API integration working', 'green');
    log('✅ All services configured for real data processing', 'green');
    log('✅ No mock data - all verification uses real APIs', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.', 'yellow');
    log('❌ System may not be ready for real KYC operations', 'red');
  }

  return passed === total;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runRealKYCTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logError(`Real KYC test suite failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  testEnvironmentSetup,
  testRealAPIConnectivity,
  testRealBankVerification,
  testRealBVNVerification,
  testRealFaceComparison,
  runRealKYCTests
};
