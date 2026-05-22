/**
 * =========================================================
 * SHIPPINGMAXGH GOLD - CONFIGURATION
 * Production-ready, works with and without build systems
 * =========================================================
 */

/**
 * Environment variable helper
 */
const getEnvVar = (key, fallback = '') => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key] || fallback;
    }
  } catch (e) {
    // Ignore
  }
  return fallback;
};

/**
 * Environment detection
 */
const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

/**
 * Main configuration object
 */
const CONFIG = {
  environment: isDevelopment ? 'development' : 'production',
  isDevelopment,
  isProduction: !isDevelopment,

  companyName: 'Shippingmaxgh Gold',
  companyTagline: 'Secure Gold Logistics',
  companyWebsite: 'https://shippingmaxgh.com',
  companyLogoUrl: '/shippingmaxgh-logo.PNG',

  brandColors: {
    primary: '#0D9488',
    secondary: '#F97316',
    primaryDark: '#115E59',
    secondaryDark: '#EA580C',
  },

  supabaseUrl: getEnvVar(
    'VITE_SUPABASE_URL',
    'https://ndiypxttcwoextvisigz.supabase.co'
  ),

  supabaseAnonKey: getEnvVar(
    'VITE_SUPABASE_ANON_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaXlweHR0Y3dvZXh0dmlzaWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEzNDQzNzUsImV4cCI6MjA0NjkyMDM3NX0.vuyKHY7F7CtJKLluf9WcKQdyxPqk85KSUz4R6OqWJmY'
  ),

  emailJsServiceId: getEnvVar('VITE_EMAILJS_SERVICE_ID', 'service_pw5vrie'),
  emailJsTemplateId: getEnvVar('VITE_EMAILJS_TEMPLATE_ID', 'template_7y9idr9'),
  emailJsPublicKey: getEnvVar('VITE_EMAILJS_PUBLIC_KEY', 'nYy6d1ieTbtwSNPgd'),

  notifications: {
    email: {
      enabled: true,
      fromEmail: 'noreply@shippingmaxgh.com',
      fromName: 'Shippingmaxgh Gold Logistics',
      triggerOnStatuses: ['all'],
    },
    sms: { enabled: false },
  },

  tracking: {
    publicTrackingEnabled: true,
    publicTrackingUrl: null,
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

  team: { maxTeamMembers: 10 },

  security: {
    enableRateLimiting: true,
    maxRequestsPerMinute: 60,
    enableAuditLog: true,
    sessionTimeout: 24 * 60 * 60 * 1000,
  },

  features: {
    enablePublicTracking: true,
    enableEmailNotifications: true,
    enableSMSNotifications: false,
    enableMultiLanguage: false,
    enableDarkMode: false,
  },
};

/**
 * Set dynamic tracking URL
 */
if (typeof window !== 'undefined') {
  CONFIG.tracking.publicTrackingUrl = `${window.location.origin}/detail.html`;
}

/**
 * Freeze in production
 */
if (!isDevelopment && typeof Object.freeze === 'function') {
  Object.freeze(CONFIG);
  Object.freeze(CONFIG.brandColors);
  Object.freeze(CONFIG.notifications);
  Object.freeze(CONFIG.tracking);
  Object.freeze(CONFIG.team);
  Object.freeze(CONFIG.security);
  Object.freeze(CONFIG.features);
}

/**
 * Export as ES module
 */
export { CONFIG };
export default CONFIG;

/**
 * CRITICAL: Also expose globally for non-module scripts
 */
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
  console.log(`✅ Config loaded (${CONFIG.environment})`);
}
