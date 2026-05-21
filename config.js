/**
 * Configuration file for Shippingmaxgh Gold - Shipment Tracker
 * PRODUCTION-READY VERSION with Environment Variable Support
 * 
 * Environment variables should be set in:
 * - .env.local (for local development - DO NOT COMMIT)
 * - Platform environment settings (Netlify, Vercel, etc.)
 * 
 * For Vite, use VITE_ prefix:
 *   VITE_SUPABASE_URL=your_url
 *   VITE_SUPABASE_ANON_KEY=your_key
 *   VITE_EMAILJS_SERVICE_ID=your_service_id
 *   VITE_EMAILJS_TEMPLATE_ID=your_template_id
 *   VITE_EMAILJS_PUBLIC_KEY=your_public_key
 */

// Helper to get environment variable with fallback
const getEnvVar = (viteKey, fallback = '') => {
  // For Vite build
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[viteKey] || fallback;
  }
  // For direct browser usage (fallback)
  return fallback;
};

// Security check: Warn if using development credentials in production
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isProduction = !isDevelopment;

const CONFIG = {
  // ============ ENVIRONMENT INFO ============
  environment: isDevelopment ? 'development' : 'production',
  isDevelopment,
  isProduction,

  // ============ COMPANY INFO ============
  companyName: 'Shippingmaxgh Gold',
  companyTagline: 'Secure Gold Logistics',
  companyLogoUrl: '/shippingmaxgh-logo.PNG',
  companyWebsite: 'https://shippingmaxgh.com',

  // ============ BRAND COLORS ============
  brandColors: {
    primary: '#0D9488',
    secondary: '#F97316',
    primaryDark: '#115E59',
    secondaryDark: '#EA580C',
  },

  // ============ SUPABASE CONFIGURATION ============
  // ⚠️ SECURITY WARNING: These should be environment variables in production
  supabaseUrl: getEnvVar(
    'VITE_SUPABASE_URL',
    'https://ndiypxttcwoextvisigz.supabase.co' // ⚠️ DEVELOPMENT ONLY
  ),
  supabaseAnonKey: getEnvVar(
    'VITE_SUPABASE_ANON_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaXlweHR0Y3dvZXh0dmlzaWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDgxNzUsImV4cCI6MjA5NDc4NDE3NX0.WQs8vU1cwPuS7huI8Re6NGOi8ZpbweSncqmpTVkkbSQ' // ⚠️ DEVELOPMENT ONLY
  ),

  // ============ EMAILJS CONFIGURATION ============
  // ⚠️ SECURITY WARNING: These should be environment variables in production
  emailJsServiceId: getEnvVar('VITE_EMAILJS_SERVICE_ID', 'service_pw5vrie'), // ⚠️ DEVELOPMENT ONLY
  emailJsTemplateId: getEnvVar('VITE_EMAILJS_TEMPLATE_ID', 'template_7y9idr9'), // ⚠️ DEVELOPMENT ONLY
  emailJsPublicKey: getEnvVar('VITE_EMAILJS_PUBLIC_KEY', 'nYy6d1ieTbtwSNPgd'), // ⚠️ DEVELOPMENT ONLY

  // ============ NOTIFICATIONS ============
  notifications: {
    email: {
      enabled: true,
      fromEmail: 'noreply@shippingmaxgh.com',
      fromName: 'Shippingmaxgh Gold Logistics',
      triggerOnStatuses: ['all'], // or specific: ['Pending', 'In Transit', 'Delivered']
    },
    sms: {
      enabled: false, // Future feature
    },
  },

  // ============ TRACKING SETTINGS ============
  tracking: {
    publicTrackingEnabled: true,
    // Use absolute URL for emails - this will be dynamically set
    publicTrackingUrl: null, // Set at runtime
    maxShipmentsPerDay: 10000,
    shipmentTypes: [
      'Gold Bar',
      'Gold Coins',
      'Gold Jewellery',
      'Raw Gold Ore',
      'Certified Assay Samples',
      'Other Precious Metals',
    ],
  },

  // ============ TEAM SETTINGS ============
  team: {
    maxTeamMembers: 10,
  },

  // ============ SECURITY SETTINGS ============
  security: {
    enableRateLimiting: true,
    maxRequestsPerMinute: 60,
    enableAuditLog: true,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  },

  // ============ FEATURE FLAGS ============
  features: {
    enablePublicTracking: true,
    enableEmailNotifications: true,
    enableSMSNotifications: false,
    enableMultiLanguage: false,
    enableDarkMode: false,
  },
};

// Set dynamic tracking URL based on current origin
if (typeof window !== 'undefined') {
  CONFIG.tracking.publicTrackingUrl = `${window.location.origin}/detail.html`;
}

// Security validation: Warn if using default credentials in production
if (isProduction) {
  const hasDefaultCredentials = 
    CONFIG.supabaseUrl.includes('ndiypxttcwoextvisigz') ||
    CONFIG.emailJsServiceId === 'service_pw5vrie';

  if (hasDefaultCredentials) {
    console.error(
      '⚠️ SECURITY WARNING: Using development credentials in production! ' +
      'Please set environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, ' +
      'VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY'
    );
  }
}

// Validation: Ensure required config is present
const validateConfig = () => {
  const required = [
    'supabaseUrl',
    'supabaseAnonKey',
    'emailJsServiceId',
    'emailJsTemplateId',
    'emailJsPublicKey',
  ];

  const missing = required.filter(key => !CONFIG[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required configuration: ${missing.join(', ')}`);
    return false;
  }

  return true;
};

// Run validation
if (typeof window !== 'undefined') {
  const isValid = validateConfig();
  if (!isValid) {
    console.error('Configuration validation failed. Please check your environment variables.');
  } else {
    console.log(`✅ Configuration loaded successfully (${CONFIG.environment} mode)`);
  }
}

// Prevent modification of config in production
if (isProduction && typeof Object.freeze === 'function') {
  Object.freeze(CONFIG);
  Object.freeze(CONFIG.brandColors);
  Object.freeze(CONFIG.notifications);
  Object.freeze(CONFIG.tracking);
  Object.freeze(CONFIG.team);
  Object.freeze(CONFIG.security);
  Object.freeze(CONFIG.features);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
