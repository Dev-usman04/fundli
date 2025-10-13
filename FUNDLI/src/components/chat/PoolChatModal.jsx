import React, { useState, useEffect, useRef } from 'react';
import { buildApiUrl } from '../../utils/config';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  X, 
  User, 
  DollarSign,
  MessageCircle,
  Paperclip,
  Download,
  FileText,
  Image,
  File,
  Phone,
  Video
} from 'lucide-react';
import VideoCall from './VideoCall';
import webrtcService from '../../services/webrtcService';
import chatSocketService from '../../services/chatSocketService';

const PoolChatModal = ({ isOpen, onClose, chat, pool, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInCall, setIsInCall] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (chat && isOpen) {
      loadMessages();
      initializeWebRTC();
    }
  }, [chat, isOpen]);

  const initializeWebRTC = () => {
    const token = localStorage.getItem('accessToken');
    webrtcService.initialize(currentUser.id, token);
    chatSocketService.initialize(currentUser.id, token);
    
    webrtcService.setCallbacks({
      onIncomingCall: (callData) => {
        setIncomingCall(callData);
      },
      onCallInitiated: (localStream) => {
        setIsInCall(true);
        setShowVideoCall(true);
      },
      onCallAnswered: (localStream) => {
        setIsInCall(true);
        setShowVideoCall(true);
      },
      onCallEnded: () => {
        setIsInCall(false);
        setShowVideoCall(false);
        setIncomingCall(null);
      },
      onRemoteStream: (remoteStream) => {
        console.log('Remote stream received:', remoteStream);
      }
    });

    // Set up chat socket callbacks
    chatSocketService.setCallbacks({
      onNewMessage: (data) => {
        console.log('📨 New message received via Socket.IO:', data);
        if (data.chatId === chat?._id) {
          setMessages(prev => {
            // Enhanced duplicate detection - check multiple fields
            const messageExists = prev.some(msg => {
              // Check by message ID
              if (msg._id && data.message._id && msg._id === data.message._id) return true;
              if (msg.id && data.message.id && msg.id === data.message.id) return true;
              
              // Check by content and timestamp (fallback)
              if (msg.content === data.message.content && 
                  msg.sender && data.message.sender &&
                  msg.sender._id === data.message.sender._id &&
                  Math.abs(new Date(msg.createdAt) - new Date(data.message.createdAt)) < 1000) {
                return true;
              }
              
              return false;
            });
            
            if (messageExists) {
              console.log('📨 Message already exists, skipping duplicate');
              return prev;
            }
            
            console.log('📨 Adding new message to chat');
            return [...prev, data.message];
          });
          
          // Scroll to bottom when new message arrives
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      },
      onUserTyping: (data) => {
        console.log('⌨️ User typing:', data);
        // You can add typing indicator UI here if needed
      },
      onConnectionReady: () => {
        console.log('🔌 Chat Socket.IO connection ready in PoolChatModal');
        // Join the chat room once connection is ready
        if (chat?.id) {
          chatSocketService.joinChat(chat.id);
        }
      },
      onConnectionLost: () => {
        console.log('🔌 Chat Socket.IO connection lost in PoolChatModal');
      },
      onError: (error) => {
        console.error('❌ Chat Socket.IO error in PoolChatModal:', error);
      }
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`/chat/chats/${chat.id}/messages`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.data.messages || []);
        // Mark messages as read
        markAsRead();
        
        // Join the chat room via Socket.IO for real-time updates
        chatSocketService.joinChat(chat.id);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(buildApiUrl(`/chat/chats/${chat.id}/read`), {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`/chat/chats/${chat.id}/messages`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          type: 'text'
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Don't add message here - let Socket.IO broadcast handle it to avoid duplicates
        // The message will be added when we receive the Socket.IO broadcast
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || isUploading) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size exceeds 10MB limit');
      return;
    }

    // Validate file type
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

    if (!allowedTypes.includes(file.type)) {
      alert('File type not supported. Allowed types: PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, GIF, WEBP');
      return;
    }

    try {
      setIsUploading(true);
      
      // Convert file to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Remove data URL prefix to get just the base64 string
      const base64Data = base64.split(',')[1];

      const token = localStorage.getItem('accessToken');
      const response = await fetch(buildApiUrl(`/chat/chats/${chat.id}/files`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: file.name,
          fileType: file.type
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.data.message]);
      } else {
        const errorData = await response.json();
        alert(`Failed to upload file: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const getOtherParticipant = () => {
    if (!chat || !chat.participants) return null;
    return chat.participants.find(p => p._id !== currentUser.id) || chat.participants[0];
  };

  const handleVoiceCall = async () => {
    try {
      const otherParticipant = getOtherParticipant();
      if (otherParticipant) {
        await webrtcService.initiateCall(otherParticipant._id, 'voice');
      }
    } catch (error) {
      console.error('Error starting voice call:', error);
      alert('Failed to start voice call. Please check your microphone permissions.');
    }
  };

  const handleVideoCall = async () => {
    try {
      const otherParticipant = getOtherParticipant();
      if (otherParticipant) {
        await webrtcService.initiateCall(otherParticipant._id, 'video');
      }
    } catch (error) {
      console.error('Error starting video call:', error);
      alert('Failed to start video call. Please check your camera and microphone permissions.');
    }
  };

  const handleAcceptCall = async () => {
    try {
      if (incomingCall) {
        await webrtcService.answerCall(incomingCall.offer, incomingCall.callType);
        setIncomingCall(null);
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      alert('Failed to accept call. Please check your camera and microphone permissions.');
    }
  };

  const handleRejectCall = () => {
    setIncomingCall(null);
    webrtcService.endCall();
  };

  const handleEndCall = () => {
    webrtcService.endCall();
    setShowVideoCall(false);
    setIsInCall(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const otherParticipant = getOtherParticipant();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium text-secondary-900 dark:text-white">
                    {otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}` : 'Unknown User'}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <DollarSign className="h-4 w-4" />
                    <span>
                      {pool ? `${pool.currency} ${pool.poolSize?.toLocaleString()} - ${pool.name}` : 'Loading pool details...'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleVoiceCall}
                  disabled={isInCall}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-secondary-700 disabled:bg-neutral-200 disabled:cursor-not-allowed rounded-lg transition-colors"
                  title="Voice call"
                >
                  <Phone className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                </button>
                <button 
                  onClick={handleVideoCall}
                  disabled={isInCall}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-secondary-700 disabled:bg-neutral-200 disabled:cursor-not-allowed rounded-lg transition-colors"
                  title="Video call"
                >
                  <Video className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-500 dark:text-neutral-400">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message, index) => {
                // Robust sender detection with fallbacks
                const senderId = message.sender._id || message.sender.id;
                const userId = currentUser.id || currentUser._id;
                
                // Convert both to strings for reliable comparison
                const senderIdStr = senderId?.toString();
                const userIdStr = userId?.toString();
                
                // Check if the sender is the current user
                let isOwn = senderIdStr === userIdStr;
                
                // Fallback: if IDs don't match, check by name
                if (!isOwn && message.sender?.firstName === currentUser?.firstName) {
                  console.log('⚠️ ID mismatch but name match in PoolChatModal - using name for alignment');
                  isOwn = true;
                }
                
                // Additional fallback: check by email if available
                if (!isOwn && message.sender?.email === currentUser?.email) {
                  console.log('⚠️ ID mismatch but email match in PoolChatModal - using email for alignment');
                  isOwn = true;
                }
                
                return (
                  <motion.div
                    key={message._id || `message-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs px-4 py-2 rounded-lg ${
                      isOwn 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-neutral-100 dark:bg-secondary-700 text-secondary-900 dark:text-white'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      
                      {/* File Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment, attIndex) => (
                            <div key={attIndex} className={`p-2 rounded border ${
                              isOwn 
                                ? 'bg-primary-500 border-primary-400' 
                                : 'bg-white dark:bg-neutral-600 border-neutral-200 dark:border-neutral-500'
                            }`}>
                              <div className="flex items-center space-x-2">
                                <div className={`${
                                  isOwn ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'
                                }`}>
                                  {getFileIcon(attachment.mimeType)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium truncate ${
                                    isOwn ? 'text-white' : 'text-neutral-900 dark:text-white'
                                  }`}>
                                    {attachment.originalName}
                                  </p>
                                  <p className={`text-xs ${
                                    isOwn ? 'text-primary-100' : 'text-neutral-500 dark:text-neutral-400'
                                  }`}>
                                    {formatFileSize(attachment.size)}
                                  </p>
                                </div>
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`p-1 rounded hover:bg-opacity-80 ${
                                    isOwn ? 'hover:bg-primary-400' : 'hover:bg-neutral-200 dark:hover:bg-neutral-500'
                                  }`}
                                  title="Download file"
                                >
                                  <Download className={`h-3 w-3 ${
                                    isOwn ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'
                                  }`} />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className={`text-xs mt-1 ${
                        isOwn ? 'text-primary-100' : 'text-neutral-500 dark:text-neutral-400'
                      }`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-neutral-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 rounded-b-lg">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
            />
            
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-neutral-700 dark:text-white resize-none"
                  rows="1"
                  disabled={isSending || isUploading}
                />
              </div>
              
              {/* File Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSending}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-600 disabled:bg-neutral-400 disabled:cursor-not-allowed text-neutral-600 dark:text-neutral-400 rounded-lg transition-colors"
                title="Attach file"
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                ) : (
                  <Paperclip className="h-5 w-5" />
                )}
              </button>
              
              {/* Send Button */}
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending || isUploading}
                className="p-2 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Video Call Modal */}
      <VideoCall
        isOpen={showVideoCall || !!incomingCall}
        onClose={handleEndCall}
        isIncoming={!!incomingCall}
        callerInfo={incomingCall?.fromUserInfo}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        callType={incomingCall?.callType || 'video'}
      />
    </AnimatePresence>
  );
};

export default PoolChatModal;
