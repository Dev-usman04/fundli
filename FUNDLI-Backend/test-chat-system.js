#!/usr/bin/env node

/**
 * Chat System Test Script
 * Tests the chat functionality between borrowers and lenders
 * Verifies that messages are properly delivered to both participants
 */

// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Import models
const User = require('./src/models/User');
const Chat = require('./src/models/Chat');
const Message = require('./src/models/Message');
const LendingPool = require('./src/models/LendingPool');

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

// Test configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Test users
let borrowerUser = null;
let lenderUser = null;
let testPool = null;
let testChat = null;

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logSuccess('Connected to MongoDB');
    return true;
  } catch (error) {
    logError(`Failed to connect to MongoDB: ${error.message}`);
    return false;
  }
}

async function createTestUsers() {
  logTest('Creating Test Users');
  
  try {
    // Create borrower user
    borrowerUser = await User.findOneAndUpdate(
      { email: 'borrower@test.com' },
      {
        firstName: 'Test',
        lastName: 'Borrower',
        email: 'borrower@test.com',
        password: 'password123',
        userType: 'borrower',
        phone: '08012345678',
        isEmailVerified: true
      },
      { upsert: true, new: true }
    );
    
    logSuccess(`Borrower user created: ${borrowerUser.firstName} ${borrowerUser.lastName} (${borrowerUser._id})`);
    
    // Create lender user
    lenderUser = await User.findOneAndUpdate(
      { email: 'lender@test.com' },
      {
        firstName: 'Test',
        lastName: 'Lender',
        email: 'lender@test.com',
        password: 'password123',
        userType: 'lender',
        phone: '08087654321',
        isEmailVerified: true
      },
      { upsert: true, new: true }
    );
    
    logSuccess(`Lender user created: ${lenderUser.firstName} ${lenderUser.lastName} (${lenderUser._id})`);
    
    return true;
  } catch (error) {
    logError(`Failed to create test users: ${error.message}`);
    return false;
  }
}

async function createTestLendingPool() {
  logTest('Creating Test Lending Pool');
  
  try {
    testPool = await LendingPool.findOneAndUpdate(
      { name: 'Test Chat Pool' },
      {
        name: 'Test Chat Pool',
        description: 'A test pool for chat functionality',
        poolSize: 100000,
        currency: 'NGN',
        duration: 12,
        interestRate: 15,
        creator: lenderUser._id,
        status: 'active'
      },
      { upsert: true, new: true }
    );
    
    logSuccess(`Test pool created: ${testPool.name} (${testPool._id})`);
    return true;
  } catch (error) {
    logError(`Failed to create test pool: ${error.message}`);
    return false;
  }
}

function generateToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function testChatCreation() {
  logTest('Testing Chat Creation');
  
  try {
    const borrowerToken = generateToken(borrowerUser);
    
    logInfo(`Attempting to create chat for pool: ${testPool._id}`);
    logInfo(`Borrower: ${borrowerUser._id} (${borrowerUser.userType})`);
    logInfo(`Lender: ${lenderUser._id} (${lenderUser.userType})`);
    
    // Test creating a chat from borrower side
    const response = await axios.post(
      `${API_BASE_URL}/chat/chats/pool/${testPool._id}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${borrowerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    logInfo(`Response status: ${response.status}`);
    logInfo(`Response data:`, JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      testChat = response.data.data.chat;
      logSuccess(`Chat created successfully: ${testChat._id}`);
      logInfo(`Participants: ${testChat.participants.map(p => `${p.firstName} ${p.lastName} (${p.userType})`).join(', ')}`);
      return true;
    } else {
      logError(`Failed to create chat: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Chat creation test failed: ${error.response?.data?.message || error.message}`);
    if (error.response?.data) {
      logError(`Error details:`, JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testMessageSending() {
  logTest('Testing Message Sending');
  
  try {
    const borrowerToken = generateToken(borrowerUser);
    const lenderToken = generateToken(lenderUser);
    
    // Test 1: Borrower sends a message
    logInfo('Test 1: Borrower sending message');
    const borrowerMessage = await axios.post(
      `${API_BASE_URL}/chat/chats/${testChat._id}/messages`,
      {
        content: 'Hello from borrower! This is a test message.',
        type: 'text'
      },
      {
        headers: {
          'Authorization': `Bearer ${borrowerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (borrowerMessage.status === 201) {
      logSuccess('Borrower message sent successfully');
      logInfo(`Message ID: ${borrowerMessage.data.data.message.id}`);
    } else {
      logError('Failed to send borrower message');
      return false;
    }
    
    // Test 2: Lender sends a message
    logInfo('Test 2: Lender sending message');
    const lenderMessage = await axios.post(
      `${API_BASE_URL}/chat/chats/${testChat._id}/messages`,
      {
        content: 'Hello from lender! I received your message.',
        type: 'text'
      },
      {
        headers: {
          'Authorization': `Bearer ${lenderToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (lenderMessage.status === 201) {
      logSuccess('Lender message sent successfully');
      logInfo(`Message ID: ${lenderMessage.data.data.message.id}`);
    } else {
      logError('Failed to send lender message');
      return false;
    }
    
    return true;
  } catch (error) {
    logError(`Message sending test failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testMessageRetrieval() {
  logTest('Testing Message Retrieval');
  
  try {
    const borrowerToken = generateToken(borrowerUser);
    const lenderToken = generateToken(lenderUser);
    
    // Test 1: Borrower retrieves messages
    logInfo('Test 1: Borrower retrieving messages');
    const borrowerMessages = await axios.get(
      `${API_BASE_URL}/chat/chats/${testChat._id}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${borrowerToken}`
        }
      }
    );
    
    if (borrowerMessages.status === 200) {
      const messages = borrowerMessages.data.data.messages;
      logSuccess(`Borrower retrieved ${messages.length} messages`);
      messages.forEach((msg, index) => {
        logInfo(`Message ${index + 1}: ${msg.content} (from ${msg.sender.firstName})`);
      });
    } else {
      logError('Failed to retrieve borrower messages');
      return false;
    }
    
    // Test 2: Lender retrieves messages
    logInfo('Test 2: Lender retrieving messages');
    const lenderMessages = await axios.get(
      `${API_BASE_URL}/chat/chats/${testChat._id}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${lenderToken}`
        }
      }
    );
    
    if (lenderMessages.status === 200) {
      const messages = lenderMessages.data.data.messages;
      logSuccess(`Lender retrieved ${messages.length} messages`);
      messages.forEach((msg, index) => {
        logInfo(`Message ${index + 1}: ${msg.content} (from ${msg.sender.firstName})`);
      });
    } else {
      logError('Failed to retrieve lender messages');
      return false;
    }
    
    return true;
  } catch (error) {
    logError(`Message retrieval test failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testChatAccess() {
  logTest('Testing Chat Access Control');
  
  try {
    const borrowerToken = generateToken(borrowerUser);
    const lenderToken = generateToken(lenderUser);
    
    // Test 1: Borrower can access the chat
    logInfo('Test 1: Borrower accessing chat');
    const borrowerAccess = await axios.get(
      `${API_BASE_URL}/chat/chats/${testChat._id}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${borrowerToken}`
        }
      }
    );
    
    if (borrowerAccess.status === 200) {
      logSuccess('Borrower can access the chat');
    } else {
      logError('Borrower cannot access the chat');
      return false;
    }
    
    // Test 2: Lender can access the chat
    logInfo('Test 2: Lender accessing chat');
    const lenderAccess = await axios.get(
      `${API_BASE_URL}/chat/chats/${testChat._id}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${lenderToken}`
        }
      }
    );
    
    if (lenderAccess.status === 200) {
      logSuccess('Lender can access the chat');
    } else {
      logError('Lender cannot access the chat');
      return false;
    }
    
    return true;
  } catch (error) {
    logError(`Chat access test failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testDatabaseConsistency() {
  logTest('Testing Database Consistency');
  
  try {
    // Check if chat exists in database
    const chat = await Chat.findById(testChat._id).populate('participants', 'firstName lastName userType');
    if (!chat) {
      logError('Chat not found in database');
      return false;
    }
    
    logSuccess(`Chat found in database: ${chat._id}`);
    logInfo(`Participants: ${chat.participants.map(p => `${p.firstName} ${p.lastName} (${p.userType})`).join(', ')}`);
    
    // Check messages in database
    const messages = await Message.find({ chat: testChat._id }).populate('sender', 'firstName lastName userType');
    logSuccess(`Found ${messages.length} messages in database`);
    
    messages.forEach((msg, index) => {
      logInfo(`Message ${index + 1}: "${msg.content}" from ${msg.sender.firstName} ${msg.sender.lastName} (${msg.sender.userType})`);
    });
    
    return true;
  } catch (error) {
    logError(`Database consistency test failed: ${error.message}`);
    return false;
  }
}

async function cleanup() {
  logTest('Cleaning Up Test Data');
  
  try {
    // Delete test messages
    await Message.deleteMany({ chat: testChat._id });
    logSuccess('Test messages deleted');
    
    // Delete test chat
    await Chat.findByIdAndDelete(testChat._id);
    logSuccess('Test chat deleted');
    
    // Delete test pool
    await LendingPool.findByIdAndDelete(testPool._id);
    logSuccess('Test pool deleted');
    
    // Delete test users
    await User.findByIdAndDelete(borrowerUser._id);
    await User.findByIdAndDelete(lenderUser._id);
    logSuccess('Test users deleted');
    
    return true;
  } catch (error) {
    logError(`Cleanup failed: ${error.message}`);
    return false;
  }
}

async function runChatSystemTests() {
  log('🚀 Starting Chat System Test Suite', 'bright');
  log('='.repeat(60), 'bright');
  
  const startTime = Date.now();
  const results = [];

  // Connect to database
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    logError('Cannot proceed without database connection');
    return false;
  }

  // Run all tests
  results.push(await createTestUsers());
  results.push(await createTestLendingPool());
  results.push(await testChatCreation());
  results.push(await testMessageSending());
  results.push(await testMessageRetrieval());
  results.push(await testChatAccess());
  results.push(await testDatabaseConsistency());
  results.push(await cleanup());

  // Calculate results
  const endTime = Date.now();
  const duration = endTime - startTime;
  const passed = results.filter(r => r).length;
  const total = results.length;

  // Display summary
  log('\n📊 Chat System Test Results Summary', 'bright');
  log('='.repeat(60), 'bright');
  log(`Total tests: ${total}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${total - passed}`, 'red');
  log(`Duration: ${duration}ms`, 'blue');
  log(`Success rate: ${Math.round((passed / total) * 100)}%`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All chat system tests passed!', 'green');
    log('✅ Chat creation working correctly', 'green');
    log('✅ Message sending working correctly', 'green');
    log('✅ Message retrieval working correctly', 'green');
    log('✅ Access control working correctly', 'green');
    log('✅ Database consistency maintained', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.', 'yellow');
    log('❌ Chat system may have issues', 'red');
  }

  // Close database connection
  await mongoose.connection.close();
  logSuccess('Database connection closed');

  return passed === total;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runChatSystemTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logError(`Chat system test suite failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  runChatSystemTests
};
