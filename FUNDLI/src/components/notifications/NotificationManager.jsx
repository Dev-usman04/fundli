import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle, AlertCircle, Info, Trophy } from 'lucide-react';
import BadgeNotification from './BadgeNotification';

const NotificationManager = ({ notifications = [], onMarkAsRead, onRemove }) => {
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoDismissTimers, setAutoDismissTimers] = useState(new Map());

  useEffect(() => {
    // Filter for unread notifications and show them
    const unreadNotifications = notifications.filter(notif => !notif.readAt);
    setVisibleNotifications(unreadNotifications.slice(0, 3)); // Show max 3 notifications
    
    // Clear existing timers
    autoDismissTimers.forEach(timer => clearTimeout(timer));
    const newTimers = new Map();
    
    // Auto-dismiss notifications after 5 seconds by marking as read (not removing)
    unreadNotifications.slice(0, 3).forEach((notification) => {
      const timer = setTimeout(() => {
        handleMarkAsRead(notification._id);
        // Remove from visible notifications after a short delay for smooth animation
        setTimeout(() => {
          setVisibleNotifications(prev => prev.filter(n => n._id !== notification._id));
        }, 300);
      }, 5000);
      
      newTimers.set(notification._id, timer);
    });
    
    setAutoDismissTimers(newTimers);
    
    return () => {
      newTimers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications]);

  const handleMarkAsRead = (notificationId) => {
    // Clear the timer for this notification
    const timer = autoDismissTimers.get(notificationId);
    if (timer) {
      clearTimeout(timer);
      setAutoDismissTimers(prev => {
        const newMap = new Map(prev);
        newMap.delete(notificationId);
        return newMap;
      });
    }
    
    if (onMarkAsRead) {
      onMarkAsRead(notificationId);
    }
    
    // Remove from visible notifications
    setVisibleNotifications(prev => prev.filter(n => n._id !== notificationId));
  };

  const handleRemove = (notificationId) => {
    // Clear the timer for this notification
    const timer = autoDismissTimers.get(notificationId);
    if (timer) {
      clearTimeout(timer);
      setAutoDismissTimers(prev => {
        const newMap = new Map(prev);
        newMap.delete(notificationId);
        return newMap;
      });
    }
    
    if (onRemove) {
      onRemove(notificationId);
    }
    
    // Remove from visible notifications
    setVisibleNotifications(prev => prev.filter(n => n._id !== notificationId));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'badge_earned':
        return <Trophy className="h-5 w-5 text-primary-600" />;
      case 'credit_score_update':
      case 'points_earned':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'loan_approval':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'loan_rejection':
        return <AlertCircle className="h-5 w-5 text-error-600" />;
      case 'repayment_due':
        return <AlertCircle className="h-5 w-5 text-warning-600" />;
      case 'collateral_verification_approved':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'loan_funding_received':
        return <Info className="h-5 w-5 text-info-600" />;
      default:
        return <Info className="h-5 w-5 text-info-600" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'badge_earned':
        return 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20';
      case 'credit_score_update':
      case 'points_earned':
        return 'border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-900/20';
      case 'loan_approval':
        return 'border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-900/20';
      case 'loan_rejection':
        return 'border-error-200 bg-error-50 dark:border-error-800 dark:bg-error-900/20';
      case 'repayment_due':
        return 'border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-900/20';
      case 'collateral_verification_approved':
        return 'border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-900/20';
      case 'loan_funding_received':
        return 'border-info-200 bg-info-50 dark:border-info-800 dark:bg-info-900/20';
      default:
        return 'border-info-200 bg-info-50 dark:border-info-800 dark:bg-info-900/20';
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full space-y-3">
      <AnimatePresence>
        {visibleNotifications.map((notification, index) => {
          // Handle badge notifications specially
          if (notification.type === 'badge_earned') {
            return (
              <BadgeNotification
                key={notification._id}
                notification={notification}
                onClose={() => handleRemove(notification._id)}
                onMarkAsRead={() => handleMarkAsRead(notification._id)}
              />
            );
          }

          // Handle other notifications
          return (
            <motion.div
              key={notification._id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                delay: index * 0.1
              }}
              className={`relative p-4 rounded-lg border shadow-lg ${getNotificationColor(notification.type)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-secondary-900 dark:text-white">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2">
                    {formatTimeAgo(notification.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(notification._id)}
                  className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Action buttons for non-badge notifications */}
              {notification.action && (
                <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-secondary-700 flex space-x-2">
                  <button
                    onClick={() => {
                      handleMarkAsRead(notification._id);
                      if (notification.action.url) {
                        window.location.href = notification.action.url;
                      }
                    }}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    {notification.action.buttonText || 'View Details'}
                  </button>
                  
                  {/* Additional action buttons based on notification type */}
                  {notification.type === 'collateral_verification_approved' && (
                    <button
                      onClick={() => {
                        handleMarkAsRead(notification._id);
                        window.location.reload();
                      }}
                      className="text-sm text-success-600 dark:text-success-400 hover:text-success-700 dark:hover:text-success-300 font-medium"
                    >
                      Refresh Data
                    </button>
                  )}
                  
                  {notification.type === 'points_earned' && (
                    <button
                      onClick={() => {
                        handleMarkAsRead(notification._id);
                        window.location.href = '/loans';
                      }}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                    >
                      View Loans
                    </button>
                  )}
                  
                  {notification.type === 'loan_funding_received' && (
                    <>
                      <button
                        onClick={() => {
                          handleMarkAsRead(notification._id);
                          window.location.href = '/dashboard/borrower';
                        }}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                      >
                        View Dashboard
                      </button>
                      <button
                        onClick={() => {
                          handleMarkAsRead(notification._id);
                          window.location.href = '/achievements';
                        }}
                        className="text-sm text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 font-medium"
                      >
                        View All Badges
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Progress indicator */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-200 dark:bg-secondary-700">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Show all notifications button */}
      {notifications.length > 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            {isExpanded ? 'Show Less' : `Show All (${notifications.length})`}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default NotificationManager;
