import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  DollarSign, 
  Users, 
  Shield, 
  TrendingUp, 
  CheckCircle, 
  ArrowRight,
  Globe,
  Star,
  ChevronDown,
  Menu,
  X,
  Award,
  Target,
  Heart,
  Rocket,
  Sparkles,
  User
} from 'lucide-react';

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const features = [
    {
      icon: DollarSign,
      title: 'Direct Lending',
      description: 'Connect borrowers and lenders without traditional banking intermediaries',
      color: 'from-primary-500 to-accent-500',
      animation: 'bounce'
    },
    {
      icon: Shield,
      title: 'Secure & Trusted',
      description: 'Advanced KYC verification and secure transaction processing',
      color: 'from-green-500 to-teal-600',
      animation: 'pulse'
    },
    {
      icon: TrendingUp,
      title: 'Better Returns',
      description: 'Higher interest rates for lenders, lower fees for borrowers',
      color: 'from-orange-500 to-red-600',
      animation: 'wiggle'
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Build trust through community verification and ratings',
      color: 'from-pink-500 to-rose-600',
      animation: 'float'
    }
  ];


  const steps = [
    {
      number: '01',
      title: 'Create Account',
      description: 'Sign up and complete KYC verification in minutes',
      icon: User,
      color: 'from-primary-500 to-accent-500'
    },
    {
      number: '02',
      title: 'Choose Your Role',
      description: 'Decide whether to borrow or lend based on your needs',
      icon: Target,
      color: 'from-green-500 to-teal-600'
    },
    {
      number: '03',
      title: 'Start Trading',
      description: 'Borrow funds or invest in lending pools with confidence',
      icon: Rocket,
      color: 'from-orange-500 to-red-600'
    }
  ];

  const stats = [
    { label: 'Active Users', value: '10K+', icon: Users, color: 'text-primary-500' },
    { label: 'Total Loans', value: '₦2M+', icon: DollarSign, color: 'text-success' },
    { label: 'Success Rate', value: '98%', icon: Award, color: 'text-orange-500' },
    { label: 'Countries', value: '25+', icon: Globe, color: 'text-accent-500' }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Small Business Owner',
      content: 'Fundli helped me secure funding for my business expansion. The process was transparent and the rates were much better than traditional banks.',
      avatar: 'SJ',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Investor',
      content: 'I\'ve been earning consistent returns through Fundli\'s lending platform. The risk assessment tools are excellent.',
      avatar: 'MC',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'Freelancer',
      content: 'As a freelancer, getting loans was always difficult. Fundli made it possible with their community-driven approach.',
      avatar: 'ER',
      rating: 5
    }
  ];

  const faqs = [
    {
      question: 'What is peer-to-peer lending?',
      answer: 'Peer-to-peer lending connects borrowers directly with individual lenders, eliminating traditional banks as intermediaries. This allows for better rates for borrowers and higher returns for lenders.'
    },
    {
      question: 'How does Fundli ensure security?',
      answer: 'We use advanced encryption, comprehensive KYC verification, secure transaction processing, and bank-level security measures to protect all user data and funds.'
    },
    {
      question: 'What is KYC verification?',
      answer: 'Know Your Customer (KYC) verification is a process where we verify your identity using government-issued documents and facial recognition to ensure platform security and compliance.'
    },
    {
      question: 'How quickly can I get a loan?',
      answer: 'After completing KYC verification, most loan applications are reviewed within 24-48 hours. Once approved, funds are typically available within 1-3 business days.'
    },
    {
      question: 'What are the requirements to become a lender?',
      answer: 'To become a lender, you need to complete KYC verification, have sufficient funds in your wallet, and understand the risks involved in peer-to-peer lending.'
    },
    {
      question: 'How do lending pools work?',
      answer: 'Lending pools allow multiple lenders to collectively fund a loan, spreading risk and enabling larger loan amounts. Lenders can join existing pools or create their own.'
    },
    {
      question: 'What happens if a borrower defaults?',
      answer: 'We have a comprehensive risk assessment system and collateral verification process. In case of default, we work with borrowers on repayment plans and may use collateral to recover funds.'
    },
    {
      question: 'Can I withdraw my investment early?',
      answer: 'Investments are typically locked for the loan duration. However, you may be able to sell your investment to other lenders through our secondary market, subject to availability.'
    },
    {
      question: 'Is my money insured?',
      answer: 'While we implement strict security measures, peer-to-peer lending carries inherent risks. We recommend diversifying your investments and only lending what you can afford to lose.'
    },
    {
      question: 'How do I contact support?',
      answer: 'You can reach our support team through the in-app chat feature, email, or phone. We also have a comprehensive help center with detailed guides and tutorials.'
    }
  ];


  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 w-full z-50 bg-white/90 dark:bg-secondary-900/90 backdrop-blur-lg border-b border-neutral-200 dark:border-neutral-700"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-bold text-neutral-900 dark:text-white">Fundli</span>
            </motion.div>

            <div className="hidden md:flex items-center space-x-8">
              <Link to="/marketplace/browse" className="text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
                Browse Loans
              </Link>
              <Link to="/referral" className="text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
                Referrals
              </Link>
              <Link to="/login" className="text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
                Login
              </Link>
              <Link to="/register" className="btn-primary">
                Get Started
              </Link>
            </div>

            <button 
              className="md:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          
          {/* Mobile Menu */}
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-neutral-200 dark:border-neutral-700 py-4"
            >
              <div className="flex flex-col space-y-4">
                <Link 
                  to="/marketplace/browse" 
                  className="text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium px-2 py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Browse Loans
                </Link>
                <Link 
                  to="/referral" 
                  className="text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium px-2 py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Referrals
                </Link>
                <Link 
                  to="/login" 
                  className="text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium px-2 py-1"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="btn-primary w-fit mx-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </motion.nav>
      {/* Hero Section */}
      <section className="bg-white dark:bg-secondary-900 py-16 sm:py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-6">
              <span className="text-white font-bold text-2xl">F</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-900 dark:text-secondary-100 mb-6 leading-tight">
            Direct{' '}
            <span className="text-gradient bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              Lending
            </span>
            <br />
            Made Simple
          </h1>

          <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect borrowers and lenders directly. No banks, no intermediaries, 
            just transparent financial solutions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link
              to="/register"
              className="btn-cta text-lg px-8 py-4 w-full sm:w-auto"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/marketplace/browse"
              className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto"
            >
              Browse Loans
            </Link>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Secure</span>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Trusted</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Community</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-20 bg-white dark:bg-secondary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-accent-500/5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="text-center group"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/20 dark:to-accent-900/20 rounded-2xl mb-3 sm:mb-4 group-hover:shadow-lg transition-all duration-300"
                >
                  <stat.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${stat.color}`} />
                </motion.div>
                <motion.div 
                  className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gradient mb-1 sm:mb-2"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-neutral-100 via-white to-primary-50 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16 lg:mb-20"
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-900 dark:text-secondary-100 mb-4 sm:mb-6 px-4">
                Why Choose{' '}
                <span className="text-gradient bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  Fundli?
                </span>
              </h2>
              <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto leading-relaxed px-4">
                We're revolutionizing the lending industry by creating direct connections 
                between borrowers and lenders with cutting-edge technology.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <div className="card p-6 sm:p-8 text-center hover:shadow-2xl transition-all duration-500 bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-neutral-200/50 dark:border-white/10 h-full hover:border-primary-300 dark:hover:border-primary-600 group">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${feature.color} rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300`}
                  >
                    <feature.icon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </motion.div>
                  <h3 className="text-lg sm:text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-3 sm:mb-4 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-white via-primary-50 to-accent-50 dark:from-secondary-800 dark:via-secondary-700 dark:to-secondary-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-10 right-10 w-24 h-24 sm:w-32 sm:h-32 border border-primary-200 dark:border-primary-800 rounded-full opacity-20"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-10 left-10 w-16 h-16 sm:w-24 sm:h-24 border border-accent-200 dark:border-accent-800 rounded-full opacity-20"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16 lg:mb-20"
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-900 dark:text-secondary-100 mb-4 sm:mb-6 px-4">
                How It{' '}
                <span className="text-gradient bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  Works
                </span>
              </h2>
              <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto leading-relaxed px-4">
                Getting started with Fundli is simple and straightforward. 
                Follow these three easy steps to begin your financial journey.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12"
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                variants={itemVariants}
                className="text-center relative group"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br ${step.color} rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 text-white shadow-2xl group-hover:shadow-glow-primary transition-all duration-300`}
                >
                  <step.icon className="h-10 w-10 sm:h-12 sm:w-12" />
                </motion.div>
                
                <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-lg">
                  {step.number}
                </div>
                
                <h3 className="text-xl sm:text-2xl font-semibold text-secondary-900 dark:text-secondary-100 mb-3 sm:mb-4">
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {step.description}
                </p>
                
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="hidden md:block absolute top-10 sm:top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary-300 to-accent-300 transform translate-x-6 origin-left"
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-neutral-100 via-white to-secondary-50 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16 lg:mb-20"
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-900 dark:text-secondary-100 mb-4 sm:mb-6 px-4">
                What Our{' '}
                <span className="text-gradient bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  Users Say
                </span>
              </h2>
              <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto leading-relaxed px-4">
                Join thousands of satisfied users who have transformed their financial lives with Fundli.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                variants={itemVariants}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <div className="card p-6 sm:p-8 bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-neutral-200/50 dark:border-white/10 h-full">
                  <div className="flex items-center mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg mr-3 sm:mr-4">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-secondary-900 dark:text-secondary-100 text-sm sm:text-base">{testimonial.name}</h4>
                      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">{testimonial.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex mb-3 sm:mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-warning/50 fill-current" />
                    ))}
                  </div>
                  
                  <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed italic">
                    "{testimonial.content}"
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>


      {/* FAQ Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-neutral-100 via-white to-primary-50 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16 lg:mb-20"
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary-900 dark:text-secondary-100 mb-4 sm:mb-6 px-4">
                Frequently Asked{' '}
                <span className="text-gradient bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                  Questions
                </span>
              </h2>
              <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto leading-relaxed px-4">
                Got questions? We've got answers. Find everything you need to know about Fundli.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
          >
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="card bg-white/90 dark:bg-white/10 backdrop-blur-sm border border-neutral-200/50 dark:border-white/10 overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full p-5 sm:p-6 text-left flex justify-between items-start hover:bg-neutral-50/50 dark:hover:bg-white/5 transition-colors group"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-secondary-900 dark:text-secondary-100 pr-4 leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {faq.question}
                  </h3>
                  <motion.div
                    animate={{ rotate: activeFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0 mt-1"
                  >
                    <ChevronDown className="h-5 w-5 text-neutral-500 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
                  </motion.div>
                </button>
                
                <motion.div
                  initial={false}
                  animate={{ height: activeFaq === index ? 'auto' : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 border-t border-neutral-100 dark:border-white/10">
                    <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed pt-4">
                      {faq.answer}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 px-4">
                Ready to Start Your{' '}
                <span className="text-gradient bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent">
                  Journey?
                </span>
              </h2>
              <p className="text-lg sm:text-xl text-white/90 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4">
                Join thousands of users who are already benefiting from direct lending. 
                Start building your financial future today.
              </p>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center px-4"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/register"
                  className="bg-white text-primary-600 hover:bg-neutral-100 font-semibold py-3 px-6 sm:py-4 sm:px-8 rounded-xl transition-all duration-300 inline-flex items-center shadow-2xl hover:shadow-glow-white w-full sm:w-auto text-center justify-center"
                >
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/marketplace/browse"
                  className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-3 px-6 sm:py-4 sm:px-8 rounded-xl transition-all duration-300 shadow-xl w-full sm:w-auto text-center"
                >
                  Explore Marketplace
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900 text-white py-12 sm:py-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12"
          >
            <motion.div variants={itemVariants} className="col-span-1 sm:col-span-2 lg:col-span-2">
              <motion.div 
                className="flex items-center space-x-3 mb-4 sm:mb-6"
                whileHover={{ scale: 1.05 }}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg sm:text-xl">F</span>
                </div>
                <span className="text-xl sm:text-2xl font-bold">Fundli</span>
              </motion.div>
              <p className="text-sm sm:text-base text-neutral-300 mb-4 sm:mb-6 max-w-md leading-relaxed">
                Revolutionizing interpersonal lending by connecting borrowers and lenders 
                directly, without traditional banking intermediaries. Building the future of finance, one connection at a time.
              </p>
              <div className="flex space-x-4 sm:space-x-6">
                <motion.a 
                  href="#" 
                  className="text-neutral-400 hover:text-primary-400 transition-colors"
                  whileHover={{ scale: 1.2, rotate: 5 }}
                >
                  <Globe className="h-5 w-5 sm:h-6 sm:w-6" />
                </motion.a>
                <motion.a 
                  href="#" 
                  className="text-neutral-400 hover:text-primary-400 transition-colors"
                  whileHover={{ scale: 1.2, rotate: 5 }}
                >
                  <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
                </motion.a>
                <motion.a 
                  href="#" 
                  className="text-neutral-400 hover:text-primary-400 transition-colors"
                  whileHover={{ scale: 1.2, rotate: 5 }}
                >
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                </motion.a>
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <h3 className="font-semibold text-base sm:text-lg mb-4 sm:mb-6 text-white">Platform</h3>
              <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-neutral-300">
                <li>
                  <Link to="/marketplace/browse" className="hover:text-primary-400 transition-colors flex items-center">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Browse Loans
                  </Link>
                </li>
                <li>
                  <Link to="/referral" className="hover:text-primary-400 transition-colors flex items-center">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Referrals
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-primary-400 transition-colors flex items-center">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    How It Works
                  </a>
                </li>
                <li>
                  <Link to="/login" className="hover:text-primary-400 transition-colors flex items-center">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Login
                  </Link>
                </li>
              </ul>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <h3 className="font-semibold text-base sm:text-lg mb-4 sm:mb-6 text-white">Support</h3>
              <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-neutral-300">
                <li>
                  <a href="#" className="hover:text-primary-400 transition-colors flex items-center">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary-400 transition-colors flex items-center">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary-400 transition-colors flex items-center">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary-400 transition-colors flex items-center">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Terms of Service
                  </a>
                </li>
              </ul>
            </motion.div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="border-t border-secondary-700 mt-8 sm:mt-12 pt-6 sm:pt-8 text-center text-sm sm:text-base text-neutral-400"
          >
            <p>&copy; 2024 Fundli. All rights reserved. Built with ❤️ for the future of finance.</p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 