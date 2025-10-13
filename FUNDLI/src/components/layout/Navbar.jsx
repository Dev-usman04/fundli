import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, User, LogOut, Settings, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Navbar = ({ onMenuClick }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, logout, userType } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
  };

  const getDashboardLink = () => {
    if (userType === 'borrower') return '/dashboard/borrower';
    if (userType === 'lender') return '/dashboard/lender';
    if (userType === 'admin') return '/dashboard/admin';
    return '/dashboard/borrower';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-secondary-900/95 backdrop-blur-md shadow-sm border-b border-neutral-200 dark:border-secondary-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-secondary-800 transition-all duration-200"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <Link 
              to={isAuthenticated ? getDashboardLink() : "/"} 
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-secondary-900 dark:text-white">Fundli</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Peer-to-Peer Lending</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links - Desktop */}
          <div className="hidden lg:flex items-center space-x-6">
            <Link
              to={user?.userType === 'borrower' ? '/borrower/browse-loans' : '/marketplace/browse'}
              className="px-3 py-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 font-medium"
            >
              Browse Loans
            </Link>
            <Link
              to="/referral"
              className="px-3 py-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 font-medium"
            >
              Referrals
            </Link>
            {isAuthenticated && (
              <Link
                to="/chat"
                className="px-3 py-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 font-medium"
              >
                Messages
              </Link>
            )}
            {isAuthenticated && (
              <Link
                to={getDashboardLink()}
                className="px-3 py-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 font-medium"
              >
                Dashboard
              </Link>
            )}
          </div>

          {/* Right side - Theme toggle, notifications, user menu */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-secondary-800 transition-all duration-200"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <Link
                  to="/notifications"
                  className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-secondary-800 transition-all duration-200 relative"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-error rounded-full border-2 border-white dark:border-secondary-900"></span>
                </Link>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-secondary-800 transition-all duration-200"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <User className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <span className="hidden sm:block text-sm font-medium">{user?.name}</span>
                  </button>

                  {/* User Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-secondary-800 rounded-xl shadow-xl border border-neutral-200 dark:border-secondary-700 py-2 z-50">
                      <div className="px-4 py-2 border-b border-neutral-200 dark:border-secondary-700">
                        <p className="text-sm font-semibold text-secondary-900 dark:text-white">{user?.name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{user?.email}</p>
                      </div>
                      <Link
                        to="/settings/profile"
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-secondary-700 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3" />
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-secondary-700 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Settings
                      </Link>
                      <hr className="my-2 border-neutral-200 dark:border-secondary-700" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-secondary-700 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-lg hover:from-primary-600 hover:to-accent-600 transition-all duration-200 font-medium shadow-lg"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 