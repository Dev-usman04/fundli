const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Loan = require('../models/Loan');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const CloudinaryService = require('../services/cloudinaryService');

// Middleware to check if user is authenticated
const { protect } = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Get all chats for a user
router.get('/chats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`🔍 Fetching chats for user: ${userId} (${req.user.userType})`);
    
    const chats = await Chat.find({
      participants: userId,
      status: 'active'
    })
    .populate('participants', 'firstName lastName email userType')
    .populate('loan', 'loanAmount purpose status')
    .populate('pool', 'name description poolSize currency duration interestRate creator')
    .populate('lastMessage.sender', 'firstName lastName')
    .sort({ 'lastMessage.timestamp': -1 });

    console.log(`📊 Found ${chats.length} chats for user ${userId}`);
    chats.forEach((chat, index) => {
      console.log(`  Chat ${index + 1}:`, {
        id: chat._id,
        participants: chat.participants?.map(p => `${p.firstName} ${p.lastName} (${p.userType})`),
        hasLoan: !!chat.loan,
        hasPool: !!chat.pool,
        poolName: chat.pool?.name,
        chatType: chat.chatType
      });
    });

    // Add unread count for each chat
    const chatsWithUnreadCount = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Message.getUnreadCount(chat._id, userId);
        return {
          ...chat.toObject(),
          unreadCount
        };
      })
    );

    res.status(200).json({
      status: 'success',
      message: 'Chats retrieved successfully',
      data: {
        chats: chatsWithUnreadCount,
        totalCount: chatsWithUnreadCount.length
      }
    });

  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch chats'
    });
  }
});

// Debug endpoint to see all chats in database
router.get('/chats/debug/all', protect, async (req, res) => {
  try {
    const allChats = await Chat.find({})
      .populate('participants', 'firstName lastName email userType')
      .populate('loan', 'loanAmount purpose status')
      .populate('pool', 'name description poolSize currency duration interestRate creator')
      .sort({ createdAt: -1 });

    console.log(`🔍 DEBUG: Found ${allChats.length} total chats in database`);
    
    allChats.forEach((chat, index) => {
      console.log(`  Chat ${index + 1}:`, {
        id: chat._id,
        participants: chat.participants?.map(p => `${p.firstName} ${p.lastName} (${p.userType})`),
        hasLoan: !!chat.loan,
        hasPool: !!chat.pool,
        poolName: chat.pool?.name,
        chatType: chat.chatType,
        status: chat.status,
        createdAt: chat.createdAt
      });
    });

    res.status(200).json({
      status: 'success',
      message: 'Debug info retrieved',
      data: {
        totalChats: allChats.length,
        chats: allChats
      }
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve debug info'
    });
  }
});

// Get or create a chat for a specific loan
router.post('/chats/loan/:loanId', protect, async (req, res) => {
  try {
    const { loanId } = req.params;
    const userId = req.user.id;

    // Verify the loan exists and user has access to it
    const loan = await Loan.findById(loanId)
      .populate('borrower', 'firstName lastName email userType')
      .populate('lendingPool');

    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }

    // Check if user is either the borrower or has access to fund this loan
    const isBorrower = loan.borrower._id.toString() === userId;
    const isLender = req.user.userType === 'lender';
    
    if (!isBorrower && !isLender) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to this loan'
      });
    }

    // Determine the other participant
    let otherParticipantId;
    if (isBorrower) {
      // If current user is borrower, we need to find a lender
      // For now, we'll create a chat that can be joined by any lender
      // In a real scenario, you might want to match with a specific lender
      otherParticipantId = loan.borrower._id; // This will be updated when a lender joins
    } else {
      // If current user is lender, the other participant is the borrower
      otherParticipantId = loan.borrower._id;
    }

    // Find or create chat
    const chat = await Chat.findOrCreateChat(otherParticipantId, userId, loanId);

    res.status(200).json({
      status: 'success',
      message: 'Chat retrieved successfully',
      data: {
        chat: {
          id: chat._id,
          participants: chat.participants,
          loan: {
            id: loan._id,
            amount: loan.loanAmount,
            purpose: loan.purpose,
            status: loan.status
          },
          lastMessage: chat.lastMessage,
          unreadCount: await Message.getUnreadCount(chat._id, userId),
          createdAt: chat.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Error creating/retrieving chat:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create/retrieve chat'
    });
  }
});

// Get or create a chat for a specific lending pool
router.post('/chats/pool/:poolId', protect, async (req, res) => {
  try {
    const { poolId } = req.params;
    const userId = req.user.id;

    console.log(`🔍 Pool chat request - User: ${userId} (${req.user.userType}), Pool: ${poolId}`);

    // Verify the lending pool exists
    const LendingPool = require('../models/LendingPool');
    const pool = await LendingPool.findById(poolId)
      .populate('creator', 'firstName lastName email userType');

    if (!pool) {
      console.log(`❌ Pool not found: ${poolId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Lending pool not found'
      });
    }

    console.log(`📊 Pool found: ${pool.name}, Creator: ${pool.creator.firstName} ${pool.creator.lastName} (${pool.creator.userType})`);

    // Check if user is either the pool creator or a borrower
    const isPoolCreator = pool.creator._id.toString() === userId;
    const isBorrower = req.user.userType === 'borrower';
    
    console.log(`👤 User details - Is Pool Creator: ${isPoolCreator}, Is Borrower: ${isBorrower}`);
    
    if (!isPoolCreator && !isBorrower) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to this lending pool'
      });
    }

    // Find or create chat for the lending pool
    let chat;
    if (isBorrower) {
      // If current user is borrower, they want to chat with the pool creator (lender)
      console.log(`💬 Creating/finding chat between borrower ${userId} and lender ${pool.creator._id} for pool ${poolId}`);
      chat = await Chat.findOrCreatePoolChat(userId, pool.creator._id, poolId);
    } else {
      // If current user is pool creator (lender), find existing chats for this pool
      console.log(`🔍 Lender looking for existing chats for pool ${poolId}`);
      
      // First, try to find a chat where the lender is a participant and the pool matches
      chat = await Chat.findOne({
        participants: userId,
        pool: poolId,
        status: 'active'
      }).populate('participants', 'firstName lastName email userType');
      
      console.log(`📊 Found existing chat for pool:`, chat ? 'Yes' : 'No');
      
      // If no chat found for this specific pool, look for any pool chats where this lender is a participant
      if (!chat) {
        console.log(`🔍 Looking for any pool chats where lender ${userId} is a participant`);
        
        // Find all pool chats where this lender is a participant
        const allPoolChats = await Chat.find({
          participants: userId,
          pool: { $exists: true },
          status: 'active'
        }).populate('participants', 'firstName lastName email userType')
          .populate('pool', 'name description poolSize currency duration interestRate creator');
        
        console.log(`📊 Found ${allPoolChats.length} pool chats for lender`);
        
        // Find the chat for this specific pool
        chat = allPoolChats.find(c => c.pool && c.pool._id.toString() === poolId);
        
        if (chat) {
          console.log(`✅ Found chat for pool ${poolId} in general search`);
        } else {
          console.log(`❌ No chat found for pool ${poolId} - creating new chat`);
          // Create a new chat for this pool if none exists
          // This handles the case where a lender wants to start a conversation
          chat = await Chat.create({
            participants: [userId, pool.creator._id],
            pool: poolId,
            chatType: 'pool_discussion',
            unreadCounts: [
              { user: userId, count: 0 },
              { user: pool.creator._id, count: 0 }
            ]
          });
          
          await chat.populate('participants', 'firstName lastName email userType');
          console.log(`✅ Created new chat for pool ${poolId}`);
        }
      }
    }

    console.log(`✅ Final chat result:`, {
      id: chat._id,
      participants: chat.participants?.map(p => `${p.firstName} ${p.lastName} (${p.userType})`),
      poolId: chat.pool,
      chatType: chat.chatType
    });

    res.status(200).json({
      status: 'success',
      message: 'Pool chat retrieved successfully',
      data: {
        chat: {
          id: chat._id,
          participants: chat.participants,
          pool: {
            id: pool._id,
            name: pool.name,
            description: pool.description,
            poolSize: pool.poolSize,
            currency: pool.currency,
            duration: pool.duration,
            interestRate: pool.interestRate,
            creator: pool.creator
          },
          lastMessage: chat.lastMessage,
          unreadCount: await Message.getUnreadCount(chat._id, userId),
          createdAt: chat.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Error creating/retrieving pool chat:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create/retrieve pool chat'
    });
  }
});

// Get messages for a specific chat
router.get('/chats/:chatId/messages', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    console.log(`🔍 Fetching messages for chat: ${chatId}, user: ${userId}`);

    // Verify user has access to this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: { $in: [userId] }
    });

    console.log(`📊 Chat found:`, chat ? 'Yes' : 'No');
    if (chat) {
      console.log(`  - Chat ID: ${chat._id}`);
      console.log(`  - Participants: ${chat.participants.map(p => p.toString())}`);
      console.log(`  - Chat Type: ${chat.chatType}`);
    }

    if (!chat) {
      console.log(`❌ Chat not found or access denied for user ${userId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Chat not found or access denied'
      });
    }

    const messages = await Message.getChatMessages(chatId, parseInt(page), parseInt(limit));
    console.log(`📨 Retrieved ${messages.length} messages for chat ${chatId}`);

    res.status(200).json({
      status: 'success',
      message: 'Messages retrieved successfully',
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch messages'
    });
  }
});

// Send a message
router.post('/chats/:chatId/messages', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type = 'text', replyTo } = req.body;
    const userId = req.user.id;

    // Verify user has access to this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: { $in: [userId] }
    }).populate('participants', 'firstName lastName email userType');
    
    console.log(`🔍 Checking chat access for user ${userId} in chat ${chatId}`);
    console.log(`📊 Chat found:`, chat ? 'Yes' : 'No');
    if (chat) {
      console.log(`👥 Chat participants:`, chat.participants?.map(p => `${p.firstName} ${p.lastName} (${p._id})`));
    }

    if (!chat) {
      return res.status(404).json({
        status: 'error',
        message: 'Chat not found or access denied'
      });
    }

    // Create the message
    const message = await Message.create({
      chat: chatId,
      sender: userId,
      content,
      type,
      replyTo
    });

    // Populate the message
    await message.populate('sender', 'firstName lastName email userType');
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
      await message.populate('replyTo.sender', 'firstName lastName');
    }

    // Update chat's last message
    chat.lastMessage = {
      content: message.content,
      sender: message.sender._id,
      timestamp: message.createdAt
    };

    // Increment unread count for other participants
    const otherParticipants = chat.participants.filter(p => p._id.toString() !== userId);
    for (const participant of otherParticipants) {
      await chat.incrementUnreadCount(participant._id);
    }

    await chat.save();

    // Broadcast message via Socket.IO
    try {
      const io = req.app.get('io');
      console.log(`📢 Attempting to broadcast message to chat ${chatId}`);
      console.log(`📢 Socket.IO instance available:`, !!io);
      
      if (io) {
        const messageData = {
          chatId: chatId,
          message: {
            _id: message._id,
            content: message.content,
            type: message.type,
            sender: message.sender,
            createdAt: message.createdAt,
            attachments: message.attachments || []
          }
        };
        
        console.log(`📢 Broadcasting message data:`, messageData);
        
        // Broadcast to the specific chat room
        io.to(`chat_${chatId}`).emit('new_message', messageData);
        console.log(`📢 Message broadcasted via Socket.IO to chat ${chatId}`);
        
        // Also broadcast to individual user rooms to ensure delivery
        for (const participant of otherParticipants) {
          io.to(`user_${participant._id}`).emit('new_message', messageData);
          console.log(`📢 Message also sent to user room: user_${participant._id}`);
        }
        
        // Debug broadcast to all connected sockets
        io.emit('debug_message', {
          chatId: chatId,
          sender: req.user.firstName,
          content: message.content.substring(0, 50) + '...',
          participants: chat.participants.map(p => `${p.firstName} ${p.lastName} (${p._id})`)
        });
      } else {
        console.log('❌ Socket.IO instance not available');
      }
    } catch (socketError) {
      console.error('❌ Socket.IO broadcast error:', socketError);
      // Don't fail the request if Socket.IO fails
    }

    // Send notification to other participants
    try {
      for (const participant of otherParticipants) {
        await NotificationService.createNotification({
          recipientId: participant._id,
          type: 'chat_message',
          title: '💬 New Message',
          message: `You received a new message from ${req.user.firstName} ${req.user.lastName}`,
          content: `Message: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
          priority: 'normal',
          actionRequired: false,
          action: {
            type: 'view',
            url: `/chat/${chatId}`,
            buttonText: 'View Chat'
          },
          relatedEntities: {
            chatId: chatId,
            senderId: userId,
            messageId: message._id
          },
          metadata: {
            chatId: chatId,
            senderName: `${req.user.firstName} ${req.user.lastName}`,
            senderEmail: req.user.email,
            messageContent: content,
            messageType: type
          }
        });
      }
    } catch (notificationError) {
      console.error('Error sending chat notifications:', notificationError);
    }

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      data: {
        message: {
          id: message._id,
          content: message.content,
          type: message.type,
          sender: message.sender,
          replyTo: message.replyTo,
          status: message.status,
          createdAt: message.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message'
    });
  }
});

// Mark messages as read
router.put('/chats/:chatId/read', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: { $in: [userId] }
    });

    if (!chat) {
      return res.status(404).json({
        status: 'error',
        message: 'Chat not found or access denied'
      });
    }

    // Mark all unread messages as read
    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: userId },
        readBy: { $not: { $elemMatch: { user: userId } } }
      },
      {
        $push: { readBy: { user: userId, readAt: new Date() } },
        $set: { status: 'read' }
      }
    );

    // Reset unread count for this user
    await chat.markAsRead(userId);

    res.status(200).json({
      status: 'success',
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark messages as read'
    });
  }
});

// Get chat participants for a loan
router.get('/loans/:loanId/chat-participants', protect, async (req, res) => {
  try {
    const { loanId } = req.params;
    const userId = req.user.id;

    // Get the loan
    const loan = await Loan.findById(loanId)
      .populate('borrower', 'firstName lastName email userType');

    if (!loan) {
      return res.status(404).json({
        status: 'error',
        message: 'Loan not found'
      });
    }

    // Check if user has access to this loan
    const isBorrower = loan.borrower._id.toString() === userId;
    const isLender = req.user.userType === 'lender';
    
    if (!isBorrower && !isLender) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to this loan'
      });
    }

    // Get all lenders who have invested in this loan or are available
    const lenders = await User.find({ userType: 'lender' })
      .select('firstName lastName email userType')
      .limit(10); // Limit to prevent too many results

    res.status(200).json({
      status: 'success',
      message: 'Chat participants retrieved successfully',
      data: {
        loan: {
          id: loan._id,
          amount: loan.loanAmount,
          purpose: loan.purpose,
          status: loan.status,
          borrower: loan.borrower
        },
        availableLenders: lenders,
        currentUser: {
          id: req.user.id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email,
          userType: req.user.userType
        }
      }
    });

  } catch (error) {
    console.error('Error fetching chat participants:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch chat participants'
    });
  }
});

// Upload file to chat
router.post('/chats/:chatId/files', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    console.log(`📁 File upload request for chat: ${chatId}, user: ${userId}`);

    // Verify user has access to this chat
    const chat = await Chat.findOne({
      _id: chatId,
      participants: userId
    });

    if (!chat) {
      console.log(`❌ Chat not found or access denied for user ${userId}`);
      return res.status(404).json({
        status: 'error',
        message: 'Chat not found or access denied'
      });
    }

    // Check if file is provided
    if (!req.body.fileData || !req.body.fileName || !req.body.fileType) {
      return res.status(400).json({
        status: 'error',
        message: 'File data, name, and type are required'
      });
    }

    const { fileData, fileName, fileType } = req.body;

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileBuffer.length > maxSize) {
      return res.status(400).json({
        status: 'error',
        message: 'File size exceeds 10MB limit'
      });
    }

    // Validate file types (allow common document types)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        status: 'error',
        message: 'File type not supported. Allowed types: PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, GIF, WEBP'
      });
    }

    console.log(`📤 Uploading file: ${fileName} (${fileType}, ${fileBuffer.length} bytes)`);

    // Upload to Cloudinary using existing service
    const uploadResult = await CloudinaryService.uploadKYCDocument(fileData, 'chat-documents');

    console.log(`✅ File uploaded successfully: ${uploadResult.secure_url}`);

    // Create message with file attachment
    const message = new Message({
      chat: chatId,
      sender: userId,
      content: `📎 Shared file: ${fileName}`,
      type: 'file',
      attachments: [{
        filename: uploadResult.public_id,
        originalName: fileName,
        mimeType: fileType,
        size: fileBuffer.length,
        url: uploadResult.secure_url
      }]
    });

    await message.save();
    await message.populate('sender', 'firstName lastName email userType');

    // Update chat's last message and timestamp
    chat.lastMessage = {
      content: message.content,
      sender: message.sender,
      timestamp: message.createdAt
    };
    chat.updatedAt = new Date();
    await chat.save();

    // Mark as read for sender
    await message.markAsRead(userId);

    // Send notification to other participants
    const otherParticipants = chat.participants.filter(p => p.toString() !== userId);
    for (const participantId of otherParticipants) {
      try {
        await NotificationService.createNotification({
          user: participantId,
          type: 'message',
          title: 'New file shared',
          message: `${req.user.firstName} shared a file in your chat`,
          data: {
            chatId: chat._id,
            messageId: message._id,
            senderId: userId,
            senderName: `${req.user.firstName} ${req.user.lastName}`
          }
        });
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        message: message
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload file'
    });
  }
});

// Delete file from chat
router.delete('/chats/:chatId/files/:messageId', protect, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user.id;

    // Find the message
    const message = await Message.findOne({
      _id: messageId,
      chat: chatId,
      sender: userId
    });

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found or you do not have permission to delete it'
      });
    }

    // Delete files from Cloudinary
    for (const attachment of message.attachments) {
      try {
        await CloudinaryService.deleteFile(attachment.filename);
        console.log(`🗑️ Deleted file from Cloudinary: ${attachment.filename}`);
      } catch (deleteError) {
        console.error('Error deleting file from Cloudinary:', deleteError);
      }
    }

    // Mark message as deleted
    message.metadata.isDeleted = true;
    message.metadata.deletedAt = new Date();
    message.content = 'This message was deleted';
    message.attachments = [];
    await message.save();

    res.status(200).json({
      status: 'success',
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete file'
    });
  }
});

// Admin chat endpoints
// Create or get admin chat with a specific user
router.post('/chats/admin/:targetUserId', protect, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { targetUserId } = req.params;
    const { targetUserType } = req.body; // 'borrower' or 'lender'

    console.log(`🔍 Admin ${adminId} initiating chat with user ${targetUserId} (${targetUserType})`);

    // Verify target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Target user not found'
      });
    }

    // Use the same pattern as regular chats - find or create admin chat
    const chat = await Chat.findOrCreateAdminChat(adminId, targetUserId, targetUserType);

    res.status(200).json({
      status: 'success',
      message: 'Admin chat initialized successfully',
      data: {
        chat: {
          id: chat._id,
          participants: chat.participants,
          chatType: chat.chatType,
          metadata: chat.metadata,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error creating admin chat:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to initialize admin chat',
      error: error.message
    });
  }
});

// Get admin chats (for admin dashboard)
router.get('/chats/admin', protect, isAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    
    console.log(`🔍 Fetching admin chats for admin: ${adminId}`);
    
    const chats = await Chat.find({
      participants: adminId,
      chatType: 'admin_support',
      status: 'active'
    })
    .populate('participants', 'firstName lastName email userType')
    .populate('lastMessage.sender', 'firstName lastName')
    .sort({ 'lastMessage.timestamp': -1 });

    console.log(`📊 Found ${chats.length} admin chats`);

    res.status(200).json({
      status: 'success',
      data: {
        chats: chats.map(chat => ({
          _id: chat._id,
          participants: chat.participants,
          chatType: chat.chatType,
          metadata: chat.metadata,
          lastMessage: chat.lastMessage,
          unreadCount: chat.unreadCounts.find(uc => uc.user.toString() === adminId)?.count || 0,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching admin chats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch admin chats',
      error: error.message
    });
  }
});

module.exports = router;
