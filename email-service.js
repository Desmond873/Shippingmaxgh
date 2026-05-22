/**
 * =========================================================
 * EMAIL NOTIFICATION SERVICE
 * Centralized email sending for shipment notifications
 * =========================================================
 */

const EmailService = {
  _initialized: false,

  getConfig() {
    // Try to get CONFIG from global scope first
    if (typeof CONFIG !== 'undefined') {
      return CONFIG;
    }
    // Fallback to import (for module environments)
    try {
      return CONFIG;
    } catch (e) {
      return null;
    }
  },

  isConfigured() {
    const config = this.getConfig();
    
    if (!config) {
      console.warn('⚠️  CONFIG not available');
      return false;
    }

    const hasEmailJs = !!(window.emailjs);
    const hasServiceId = !!(config.emailJsServiceId);
    const hasTemplateId = !!(config.emailJsTemplateId);
    const hasPublicKey = !!(config.emailJsPublicKey);
    const isEnabled = !!(config.notifications?.email?.enabled !== false);

    return hasEmailJs && hasServiceId && hasTemplateId && hasPublicKey && isEnabled;
  },

  initialize() {
    if (this._initialized) {
      return true; // Already initialized
    }

    const config = this.getConfig();
    
    if (!config) {
      console.warn('⚠️  CONFIG not loaded yet - EmailJS initialization deferred');
      return false;
    }

    if (!this.isConfigured()) {
      console.warn('⚠️  EmailJS not properly configured:', {
        hasEmailJs: !!window.emailjs,
        hasServiceId: !!config.emailJsServiceId,
        hasTemplateId: !!config.emailJsTemplateId,
        hasPublicKey: !!config.emailJsPublicKey,
        isEnabled: config.notifications?.email?.enabled !== false,
      });
      return false;
    }

    try {
      if (window.emailjs && typeof window.emailjs.init === 'function') {
        window.emailjs.init(config.emailJsPublicKey);
        this._initialized = true;
        console.log('✅ EmailJS initialized successfully');
        return true;
      } else {
        console.warn('⚠️  EmailJS library not found or init method unavailable');
        return false;
      }
    } catch (error) {
      console.error('❌ EmailJS initialization failed:', error);
      return false;
    }
  },

  buildParams(packageData, eventType = 'created', additionalData = {}) {
    const config = this.getConfig();
    const baseParams = {
      to_email: packageData.recipient_email,
      recipient_name: packageData.recipient_name,
      tracking_number: packageData.tracking_number,
      status: packageData.status,
      location: packageData.location,
      company_name: (config?.companyName) || 'Shippingmaxgh Gold',
      current_date: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      public_tracking_link: `${window.location.origin}/detail.html?id=${packageData.id}&public=true`,
    };

    if (eventType === 'created') {
      baseParams.message = 'Your gold shipment has been successfully registered.';
      baseParams.subject = `Shipment Created - #${packageData.tracking_number}`;
      baseParams.notes = additionalData.notes || 'New shipment';
    } else if (eventType === 'status_updated') {
      baseParams.message = `Status updated to: ${packageData.status}`;
      baseParams.subject = `Status Update - ${packageData.status} - #${packageData.tracking_number}`;
      baseParams.notes = additionalData.notes || 'Status updated';
    }

    return baseParams;
  },

  async send(params) {
    const config = this.getConfig();

    // Ensure initialized before sending
    if (!this._initialized) {
      this.initialize();
    }

    if (!this.isConfigured()) {
      return { 
        success: false, 
        error: 'Email service not properly configured. Check console for details.',
        silent: true 
      };
    }

    try {
      console.log('📧 Sending email to:', params.to_email);
      console.log('   Service ID:', config.emailJsServiceId);
      console.log('   Template ID:', config.emailJsTemplateId);
      
      const response = await window.emailjs.send(
        config.emailJsServiceId,
        config.emailJsTemplateId,
        params
      );
      
      console.log('✅ Email sent successfully:', response.status);
      return { success: true, data: response };
    } catch (error) {
      const errorMsg = error.text || error.message || JSON.stringify(error);
      
      // Handle specific EmailJS errors
      if (errorMsg.includes('Invalid grant') || errorMsg.includes('Gmail_API')) {
        console.error('❌ EmailJS Gmail Authorization Failed');
        console.error('   Error:', errorMsg);
        console.error('   Fix: Reconnect your Gmail account in the EmailJS dashboard:');
        console.error('   1. Go to EmailJS Dashboard → Email Services');
        console.error('   2. Click on the Gmail service');
        console.error('   3. Click "Reconnect Account"');
        console.error('   4. Authorize the connection');
        
        return { 
          success: false, 
          error: 'EmailJS Gmail account needs to be reconnected. Contact administrator.',
          details: errorMsg,
          requiresAdminAction: true
        };
      }
      
      if (errorMsg.includes('Precondition Failed')) {
        console.error('❌ EmailJS Request Failed (412 Precondition Failed)');
        console.error('   This usually means the service or template is misconfigured');
        console.error('   Verify:');
        console.error('   - Service ID:', config.emailJsServiceId);
        console.error('   - Template ID:', config.emailJsTemplateId);
        console.error('   - Public Key:', config.emailJsPublicKey.substring(0, 10) + '...');
      }
      
      console.error('❌ Email send failed:', errorMsg);
      return { 
        success: false, 
        error: errorMsg,
        details: error,
        requiresAdminAction: errorMsg.includes('Invalid grant')
      };
    }
  },

  async sendShipmentCreated(packageData, notes = '') {
    const params = this.buildParams(packageData, 'created', { notes });
    return await this.send(params);
  },

  async sendStatusUpdate(packageData, newStatus, newLocation, notes = '') {
    const updatedPackage = { ...packageData, status: newStatus, location: newLocation };
    const params = this.buildParams(updatedPackage, 'status_updated', { notes });
    return await this.send(params);
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
};

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => EmailService.initialize());
} else {
  EmailService.initialize();
}

// Export globally
if (typeof window !== 'undefined') {
  window.EmailService = EmailService;
}

export default EmailService;
