const jwt = require('jsonwebtoken');
const User = require('../models/User');

class ChatSocketService {
  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
    console.log('✅ Chat Socket.IO service initialized');
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      // Handle user authentication and joining
      socket.on('join', async (data) => {
        try {
          const { token } = data;
          
          if (!token) {
            socket.emit('error', { message: 'No authentication token provided' });
            return;
          }

          // Verify JWT token
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id).select('firstName lastName email userType');
          
          if (!user) {
            socket.emit('error', { message: 'User not found' });
            return;
          }

          // Store user info in socket
          socket.userId = user._id.toString();
          socket.userInfo = user;
          
          // Join user to their personal room
          socket.join(`user_${socket.userId}`);
          
          // Also join a general room for all users of the same type (borrower/lender)
          socket.join(`userType_${user.userType}`);
          
          console.log(`👤 User ${user.firstName} ${user.lastName} (${user.userType}) joined chat rooms: user_${socket.userId}, userType_${user.userType}`);
          
          socket.emit('joined', {
            message: 'Successfully joined chat',
            user: user,
            rooms: [`user_${socket.userId}`, `userType_${user.userType}`]
          });

        } catch (error) {
          console.error('❌ Socket join error:', error);
          socket.emit('error', { message: 'Authentication failed' });
        }
      });

      // Handle joining a specific chat room
      socket.on('join_chat', (data) => {
        try {
          const { chatId } = data;
          
          if (!socket.userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          if (!chatId) {
            socket.emit('error', { message: 'Chat ID required' });
            return;
          }

          // Join the specific chat room
          socket.join(`chat_${chatId}`);
          
          console.log(`💬 User ${socket.userId} joined chat room: chat_${chatId}`);
          
          socket.emit('chat_joined', {
            message: 'Successfully joined chat room',
            chatId: chatId
          });

        } catch (error) {
          console.error('❌ Socket join_chat error:', error);
          socket.emit('error', { message: 'Failed to join chat room' });
        }
      });

      // Handle leaving a chat room
      socket.on('leave_chat', (data) => {
        try {
          const { chatId } = data;
          
          if (chatId) {
            socket.leave(`chat_${chatId}`);
            console.log(`👋 User ${socket.userId} left chat room: chat_${chatId}`);
          }

        } catch (error) {
          console.error('❌ Socket leave_chat error:', error);
        }
      });

      // Handle sending messages (this will be called by the backend when a message is created)
      socket.on('send_message', (data) => {
        try {
          const { chatId, message } = data;
          
          if (!socket.userId) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          if (!chatId || !message) {
            socket.emit('error', { message: 'Chat ID and message required' });
            return;
          }

          // Broadcast message to all users in the chat room
          socket.to(`chat_${chatId}`).emit('new_message', {
            chatId: chatId,
            message: {
              ...message,
              sender: {
                _id: socket.userId,
                firstName: socket.userInfo.firstName,
                lastName: socket.userInfo.lastName,
                userType: socket.userInfo.userType
              }
            }
          });

          console.log(`📤 Message broadcasted in chat ${chatId} by user ${socket.userId}`);

        } catch (error) {
          console.error('❌ Socket send_message error:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        try {
          const { chatId } = data;
          
          if (!socket.userId || !chatId) return;

          socket.to(`chat_${chatId}`).emit('user_typing', {
            chatId: chatId,
            userId: socket.userId,
            userInfo: {
              firstName: socket.userInfo.firstName,
              lastName: socket.userInfo.lastName
            },
            isTyping: true
          });

        } catch (error) {
          console.error('❌ Socket typing_start error:', error);
        }
      });

      socket.on('typing_stop', (data) => {
        try {
          const { chatId } = data;
          
          if (!socket.userId || !chatId) return;

          socket.to(`chat_${chatId}`).emit('user_typing', {
            chatId: chatId,
            userId: socket.userId,
            userInfo: {
              firstName: socket.userInfo.firstName,
              lastName: socket.userInfo.lastName
            },
            isTyping: false
          });

        } catch (error) {
          console.error('❌ Socket typing_stop error:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
      });
    });
  }

  // Method to broadcast a message to all participants in a chat
  broadcastMessage(chatId, message, participants = []) {
    // Broadcast to the specific chat room
    this.io.to(`chat_${chatId}`).emit('new_message', {
      chatId: chatId,
      message: message
    });
    console.log(`📢 Message broadcasted to chat ${chatId}`);
    
    // Also broadcast to individual user rooms to ensure delivery
    if (participants.length > 0) {
      participants.forEach(participant => {
        this.io.to(`user_${participant._id}`).emit('new_message', {
          chatId: chatId,
          message: message
        });
        console.log(`📢 Message also sent to user room: user_${participant._id}`);
      });
    }
  }

  // Method to broadcast typing indicator
  broadcastTyping(chatId, userId, userInfo, isTyping) {
    this.io.to(`chat_${chatId}`).emit('user_typing', {
      chatId: chatId,
      userId: userId,
      userInfo: userInfo,
      isTyping: isTyping
    });
  }
}

module.exports = ChatSocketService;










