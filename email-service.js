/**
 * Email Notification Service
 * Centralized email sending logic for all shipment notifications
 * 
 * Usage:
 *   await EmailService.sendShipmentCreated(package);
 *   await EmailService.sendStatusUpdate(package, newStatus, newLocation, notes);
 */

const EmailService = {
  /**
   * Check if EmailJS is properly configured and initialized
   */
  isConfigured() {
    return !!(
      window.emailjs &&
      CONFIG.notifications?.email?.enabled &&
      CONFIG.emailJsServiceId &&
      CONFIG.emailJsTemplateId &&
      CONFIG.emailJsPublicKey
    );
  },

  /**
   * Initialize EmailJS (should be called once on app load)
   */
  initialize() {
    if (!this.isConfigured()) {
      console.warn('EmailJS not configured - notifications will be disabled');
      return false;
    }

    try {
      if (window.emailjs && typeof window.emailjs.init === 'function') {
        window.emailjs.init(CONFIG.emailJsPublicKey);
        console.log('EmailJS initialized successfully');
        return true;
      }
    } catch (error) {
      console.error('EmailJS initialization failed:', error);
      return false;
    }
    return false;
  },

  /**
   * Build email template parameters
   */
  buildParams(packageData, eventType = 'created', additionalData = {}) {
    const baseParams = {
      to_email: packageData.recipient_email,
      recipient_name: packageData.recipient_name,
      tracking_number: packageData.tracking_number,
      status: packageData.status,
      location: packageData.location,
      company_name: CONFIG.companyName || 'Shippingmaxgh Gold',
      current_date: new Date().toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      }),
      public_tracking_link: `${window.location.origin}/detail.html?id=${packageData.id}&public=true`,
    };

    // Add event-specific message
    if (eventType === 'created') {
      baseParams.message = 'Your gold shipment has been successfully registered in our system.';
      baseParams.subject = `Shipment Created - Tracking #${packageData.tracking_number}`;
      baseParams.notes = additionalData.notes || 'New shipment registered';
    } else if (eventType === 'status_updated') {
      baseParams.message = `Your shipment status has been updated to: ${packageData.status}`;
      baseParams.subject = `Shipment Status Update - ${packageData.status} - Tracking #${packageData.tracking_number}`;
      baseParams.notes = additionalData.notes || 'Status updated';
    } else {
      baseParams.message = 'Update on your shipment.';
      baseParams.subject = `Shipment Notification - Tracking #${packageData.tracking_number}`;
      baseParams.notes = additionalData.notes || '';
    }

    return baseParams;
  },

  /**
   * Send email notification
   */
  async send(params) {
    if (!this.isConfigured()) {
      console.log('Email notifications are disabled or not configured');
      return { 
        success: false, 
        error: 'Email service not configured',
        silent: true // Don't show error to user
      };
    }

    try {
      console.log('Sending email notification:', {
        to: params.to_email,
        tracking: params.tracking_number,
        status: params.status
      });

      const response = await window.emailjs.send(
        CONFIG.emailJsServiceId,
        CONFIG.emailJsTemplateId,
        params
      );

      console.log('Email sent successfully:', response);
      return { 
        success: true, 
        data: response,
        message: 'Notification sent successfully'
      };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { 
        success: false, 
        error: error.text || error.message || 'Email sending failed',
        details: error
      };
    }
  },

  /**
   * Send notification when a new shipment is created
   */
  async sendShipmentCreated(packageData, notes = '') {
    const params = this.buildParams(packageData, 'created', { notes });
    return await this.send(params);
  },

  /**
   * Send notification when shipment status is updated
   */
  async sendStatusUpdate(packageData, newStatus, newLocation, notes = '') {
    const updatedPackage = {
      ...packageData,
      status: newStatus,
      location: newLocation
    };
    const params = this.buildParams(updatedPackage, 'status_updated', { notes });
    return await this.send(params);
  },

  /**
   * Validate email address format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Get user-friendly error message
   */
  getUserFriendlyError(error) {
    if (!error) return 'Unknown error occurred';
    
    const errorMap = {
      'Invalid email': 'The recipient email address is invalid',
      'Service not found': 'Email service configuration error',
      'Template not found': 'Email template configuration error',
      'Rate limit exceeded': 'Email quota exceeded. Please try again later.',
      'Network error': 'Network connection failed. Please check your internet connection.',
    };

    // Check for known error patterns
    for (const [key, message] of Object.entries(errorMap)) {
      if (error.includes(key) || error === key) {
        return message;
      }
    }

    return 'Failed to send notification. The shipment was saved, but email could not be sent.';
  }
};

// Initialize on script load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    EmailService.initialize();
  });
} else {
  EmailService.initialize();
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.EmailService = EmailService;
}
