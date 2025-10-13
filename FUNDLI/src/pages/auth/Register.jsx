import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle, ArrowRight, Sparkles, Shield, Zap, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'borrower',
    referralCode: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { register, isLoading: authLoading, isRetrying, retryCount } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    // Check password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      setIsLoading(false);
      return;
    }

    // Phone number validation - accept both +234 and 0 formats for Nigeria
    const cleanPhone = formData.phone.replace(/\s/g, '');
    const phoneRegex = /^(\+234|0)?[789][01]\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid Nigerian phone number (e.g., +2349033295837 or 09033295837)');
      setIsLoading(false);
      return;
    }

    try {
      // Remove confirmPassword from the data sent to API
      const { confirmPassword, ...registrationData } = formData;
      
      // Clean phone number format
      registrationData.phone = registrationData.phone.replace(/\s/g, '');
      
      console.log('Registration - Data being sent to API:', registrationData);
      console.log('Registration - userType being sent:', registrationData.userType);
      
      const result = await register(registrationData);
      console.log('Registration - API response:', result);
      
      if (result.success) {
        setSuccess(result.message);
        console.log('Registration successful, navigating to OTP with userType:', formData.userType);
        // Redirect to OTP verification immediately (user stays logged in)
        navigate('/verify-otp', { 
          state: { 
            email: formData.email,
            userType: formData.userType 
          } 
        });
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 via-primary-50 to-secondary-100 dark:from-secondary-900 dark:via-primary-900 dark:to-secondary-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      
      {/* Floating Elements */}
      <motion.div
        className="absolute top-20 left-20 w-20 h-20 bg-gradient-to-r from-primary-400 to-accent-400 rounded-full blur-xl opacity-20"
        animate={{
          y: [0, -20, 0],
          x: [0, 10, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-32 h-32 bg-gradient-to-r from-secondary-400 to-primary-400 rounded-full blur-xl opacity-20"
        animate={{
          y: [0, 20, 0],
          x: [0, -10, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-2xl">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-accent-400 to-primary-400 rounded-full flex items-center justify-center">
                <Zap className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold text-gradient mb-2">
            Join Fundli
          </h2>
          <p className="text-neutral-600 dark:text-neutral-200 text-lg">
            Start your financial journey with us today
          </p>
        </motion.div>

        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card p-8 backdrop-blur-lg bg-white/80 dark:bg-white/10 border border-neutral-200/50 dark:border-white/20"
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <label htmlFor="firstName" className="form-label text-neutral-700 dark:text-white">
                    First Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-neutral-400 dark:text-neutral-300 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors" />
                    </div>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      className="input-field pl-12 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-200 bg-white dark:bg-white/10 border-neutral-300 dark:border-white/20 backdrop-blur-sm"
                      placeholder="First name"
                    />
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <label htmlFor="lastName" className="form-label text-neutral-700 dark:text-white">
                    Last Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-neutral-400 dark:text-neutral-300 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors" />
                    </div>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="input-field pl-12 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-200 bg-white dark:bg-white/10 border-neutral-300 dark:border-white/20 backdrop-blur-sm"
                      placeholder="Last name"
                    />
                  </div>
                </motion.div>
              </div>

              {/* Email Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <label htmlFor="email" className="form-label text-neutral-700 dark:text-white">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-neutral-400 dark:text-neutral-300 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field pl-12 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-200 bg-white dark:bg-white/10 border-neutral-300 dark:border-white/20 backdrop-blur-sm"
                    placeholder="Enter your email"
                  />
                </div>
              </motion.div>

              {/* Phone Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <label htmlFor="phone" className="form-label text-neutral-700 dark:text-white">
                  Phone Number
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-neutral-400 dark:text-neutral-300 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field pl-12 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-200 bg-white dark:bg-white/10 border-neutral-300 dark:border-white/20 backdrop-blur-sm"
                    placeholder="Enter your phone number"
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-300">
                  Format: +2349033295837 or 09033295837 (Nigerian numbers)
                </p>
              </motion.div>

              {/* Referral Code Field */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <label htmlFor="referralCode" className="form-label text-neutral-700 dark:text-white">
                  Referral Code (Optional)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-neutral-400 dark:text-neutral-300 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors" />
                  </div>
                  <input
                    id="referralCode"
                    name="referralCode"
                    type="text"
                    value={formData.referralCode}
                    onChange={handleChange}
                    className="input-field pl-12 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-200 bg-white dark:bg-white/10 border-neutral-300 dark:border-white/20 backdrop-blur-sm"
                    placeholder="Enter referral code (optional)"
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-300">
                  Have a friend's referral code? Enter it here to earn rewards together
                </p>
              </motion.div>

              {/* User Type Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <label className="form-label text-neutral-700 dark:text-white">
                  I want to:
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="relative flex cursor-pointer rounded-xl border border-neutral-300 dark:border-white/20 bg-white dark:bg-white/5 p-4 shadow-sm focus:outline-none hover:bg-neutral-50 dark:hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                    <input
                      type="radio"
                      name="userType"
                      value="borrower"
                      checked={formData.userType === 'borrower'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="flex flex-1">
                      <span className="flex flex-col">
                        <span className="block text-sm font-semibold text-neutral-900 dark:text-white">Borrow Money</span>
                        <span className="mt-1 flex items-center text-sm text-neutral-600 dark:text-neutral-200">Get loans for your needs</span>
                      </span>
                    </span>
                    <span className={`pointer-events-none absolute -inset-px rounded-xl border-2 transition-colors ${
                      formData.userType === 'borrower' ? 'border-primary-500' : 'border-transparent'
                    }`} />
                  </label>
                  
                  <label className="relative flex cursor-pointer rounded-xl border border-neutral-300 dark:border-white/20 bg-white dark:bg-white/5 p-4 shadow-sm focus:outline-none hover:bg-neutral-50 dark:hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                    <input
                      type="radio"
                      name="userType"
                      value="lender"
                      checked={formData.userType === 'lender'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="flex flex-1">
                      <span className="flex flex-col">
                        <span className="block text-sm font-semibold text-neutral-900 dark:text-white">Lend Money</span>
                        <span className="mt-1 flex items-center text-sm text-neutral-600 dark:text-neutral-200">Earn returns on investments</span>
                      </span>
                    </span>
                    <span className={`pointer-events-none absolute -inset-px rounded-xl border-2 transition-colors ${
                      formData.userType === 'lender' ? 'border-primary-500' : 'border-transparent'
                    }`} />
                  </label>
                </div>
              </motion.div>


              {/* Password Fields */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                >
                  <label htmlFor="password" className="form-label text-neutral-700 dark:text-white">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-neutral-400 dark:text-neutral-300 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="input-field pl-12 pr-12 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-200 bg-white dark:bg-white/10 border-neutral-300 dark:border-white/20 backdrop-blur-sm"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-neutral-100 dark:hover:bg-white/10 rounded-r-xl transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-neutral-400 dark:text-neutral-300 hover:text-neutral-600 dark:hover:text-white transition-colors" />
                      ) : (
                        <Eye className="h-5 w-5 text-neutral-400 dark:text-neutral-300 hover:text-neutral-600 dark:hover:text-white transition-colors" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-300">
                    Must be at least 8 characters with uppercase, lowercase, and number
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                >
                  <label htmlFor="confirmPassword" className="form-label text-neutral-700 dark:text-white">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-neutral-400 dark:text-neutral-300 group-focus-within:text-primary-500 dark:group-focus-within:text-primary-400 transition-colors" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="input-field pl-12 pr-12 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-200 bg-white dark:bg-white/10 border-neutral-300 dark:border-white/20 backdrop-blur-sm"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center hover:bg-neutral-100 dark:hover:bg-white/10 rounded-r-xl transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-neutral-400 dark:text-neutral-300 hover:text-neutral-600 dark:hover:text-white transition-colors" />
                      ) : (
                        <Eye className="h-5 w-5 text-neutral-400 dark:text-neutral-300 hover:text-neutral-600 dark:hover:text-white transition-colors" />
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-error/20 border border-error/30 rounded-xl p-4 backdrop-blur-sm"
              >
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-error mr-3" />
                  <p className="text-error text-sm font-medium">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Success Message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-success/20 border border-success/30 rounded-xl p-4 backdrop-blur-sm"
              >
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success mr-3" />
                  <p className="text-success text-sm font-medium">{success}</p>
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
            >
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-cta disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {isLoading || authLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>
                      {isRetrying ? `Retrying... (${retryCount}/2)` : 'Creating account...'}
                    </span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </motion.div>

            {/* Sign In Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="text-center"
            >
              <p className="text-neutral-600 dark:text-neutral-200 text-sm">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-primary-600 dark:text-white hover:text-primary-700 dark:hover:text-primary-200 transition-colors duration-300 hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </motion.div>
          </form>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.3 }}
          className="grid grid-cols-4 gap-4 text-center mt-8"
        >
          <div className="card p-4 border-neutral-200/50 dark:border-white/10 bg-white/60 dark:bg-white/5 group hover:border-primary-400/50 transition-all duration-300">
            <Shield className="h-6 w-6 text-neutral-500 dark:text-neutral-300 group-hover:text-primary-500 dark:group-hover:text-primary-400 mx-auto mb-2 transition-colors" />
            <p className="text-neutral-600 dark:text-neutral-200 text-xs font-medium group-hover:text-neutral-800 dark:group-hover:text-white transition-colors">Secure</p>
          </div>
          <div className="card p-4 border-neutral-200/50 dark:border-white/10 bg-white/60 dark:bg-white/5 group hover:border-primary-400/50 transition-all duration-300">
            <Zap className="h-6 w-6 text-neutral-500 dark:text-neutral-300 group-hover:text-primary-500 dark:group-hover:text-primary-400 mx-auto mb-2 transition-colors" />
            <p className="text-neutral-600 dark:text-neutral-200 text-xs font-medium group-hover:text-neutral-800 dark:group-hover:text-white transition-colors">Fast</p>
          </div>
          <div className="card p-4 border-neutral-200/50 dark:border-white/10 bg-white/60 dark:bg-white/5 group hover:border-primary-400/50 transition-all duration-300">
            <TrendingUp className="h-6 w-6 text-neutral-500 dark:text-neutral-300 group-hover:text-primary-500 dark:group-hover:text-primary-400 mx-auto mb-2 transition-colors" />
            <p className="text-neutral-600 dark:text-neutral-200 text-xs font-medium group-hover:text-neutral-800 dark:group-hover:text-white transition-colors">Profitable</p>
          </div>
          <div className="card p-4 border-neutral-200/50 dark:border-white/10 bg-white/60 dark:bg-white/5 group hover:border-primary-400/50 transition-all duration-300">
            <Sparkles className="h-6 w-6 text-neutral-500 dark:text-neutral-300 group-hover:text-primary-500 dark:group-hover:text-primary-400 mx-auto mb-2 transition-colors" />
            <p className="text-neutral-600 dark:text-neutral-200 text-xs font-medium group-hover:text-neutral-800 dark:group-hover:text-white transition-colors">Smart</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register; 