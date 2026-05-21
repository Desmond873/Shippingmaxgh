/**
 * Core Application Logic - FIXED VERSION
 * Centralized Supabase client and authentication utilities
 * All other files should use this global client instead of creating their own
 */

// ============ SINGLETON SUPABASE CLIENT ============
// Create ONE client instance to be shared across all files
let supabaseClient = null;

function initializeSupabase() {
  if (!supabaseClient) {
    if (!window.supabase || !window.supabase.createClient) {
      console.error('Supabase library not loaded!');
      return null;
    }

    if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) {
      console.error('Supabase credentials not configured!');
      return null;
    }

    supabaseClient = window.supabase.createClient(
      CONFIG.supabaseUrl,
      CONFIG.supabaseAnonKey
    );

    console.log('Supabase client initialized');
  }
  return supabaseClient;
}

// Initialize immediately
const supabase = initializeSupabase();

// Export globally for use in other files
if (typeof window !== 'undefined') {
  window.supabaseClient = supabase;
}

// ============ AUTHENTICATION ============

async function checkAuth() {
  try {
    if (!supabase) return null;
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Auth check error:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Auth check failed:', error);
    return null;
  }
}

async function requireAuth() {
  const session = await checkAuth();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

async function signUp(email, password) {
  try {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard.html`
      }
    });
    
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: error.message };
  }
}

async function signIn(email, password) {
  try {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message };
  }
}

async function signOut() {
  try {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
}

// ============ DATABASE OPERATIONS ============

async function getPackages() {
  try {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    const { data, error } = await supabase
      .from('packages')
      .select('*, tracking_history(id, status, location, notes, created_at)')
      .order('created_at', { ascending: false });
    
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get packages error:', error);
    return { success: false, error: error.message };
  }
}

async function getPackageById(packageId) {
  try {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    const { data, error } = await supabase
      .from('packages')
      .select('*, tracking_history(id, status, location, notes, created_at)')
      .eq('id', packageId)
      .single();
    
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error('Get package error:', error);
    return { success: false, error: error.message };
  }
}

async function addPackage(trackingNumber, recipientName, recipientEmail, status, location, shipmentType = null) {
  try {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    const session = await checkAuth();
    if (!session) return { success: false, error: 'Not authenticated' };

    // Validate inputs
    if (!trackingNumber || !recipientName || !recipientEmail || !status || !location) {
      return { success: false, error: 'Missing required fields' };
    }

    // Validate email format
    if (!EmailService.isValidEmail(recipientEmail)) {
      return { success: false, error: 'Invalid email address format' };
    }

    const packageData = {
      tracking_number: trackingNumber,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      status,
      location,
      created_by: session.user.id
    };

    if (shipmentType) {
      packageData.shipment_type = shipmentType;
    }

    const { data, error } = await supabase
      .from('packages')
      .insert([packageData])
      .select()
      .single();
    
    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return { success: false, error: 'This tracking number already exists' };
      }
      return { success: false, error: error.message };
    }

    // Add initial tracking history
    await addTrackingHistory(data.id, status, location, 'Shipment created');
    
    return { success: true, data };
  } catch (error) {
    console.error('Add package error:', error);
    return { success: false, error: error.message };
  }
}

async function addTrackingHistory(packageId, status, location, notes = null) {
  try {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    const session = await checkAuth();
    if (!session) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('tracking_history')
      .insert([{ 
        package_id: packageId, 
        status, 
        location, 
        notes,
        created_by: session.user.id 
      }])
      .select()
      .single();
    
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    console.error('Add tracking history error:', error);
    return { success: false, error: error.message };
  }
}

async function updatePackageStatus(packageId, newStatus, newLocation, notes = null) {
  try {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    // Update package
    const { data: packageData, error: updateError } = await supabase
      .from('packages')
      .update({ status: newStatus, location: newLocation })
      .eq('id', packageId)
      .select()
      .single();
    
    if (updateError) return { success: false, error: updateError.message };
    
    // Add tracking history
    await addTrackingHistory(packageId, newStatus, newLocation, notes);
    
    return { success: true, data: packageData };
  } catch (error) {
    console.error('Update package status error:', error);
    return { success: false, error: error.message };
  }
}

async function searchPackages(query) {
  try {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    if (!query || query.trim() === '') {
      return await getPackages();
    }

    const searchTerm = `%${query.trim()}%`;
    
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .or(`tracking_number.ilike.${searchTerm},recipient_name.ilike.${searchTerm},recipient_email.ilike.${searchTerm}`)
      .order('created_at', { ascending: false });
    
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Search packages error:', error);
    return { success: false, error: error.message };
  }
}

// ============ TRACKING NUMBER GENERATION ============

/**
 * Generate a unique tracking number with collision detection
 * Format: SHP-YYYY-XXXXX-CC where CC is a check digit
 */
async function generateTrackingNumber() {
  const year = new Date().getFullYear();
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random 5-digit number
    const randomNum = Math.floor(Math.random() * 90000) + 10000;
    
    // Calculate simple check digit (sum of digits mod 10)
    const checkDigit = String(randomNum).split('').reduce((sum, d) => sum + parseInt(d), 0) % 10;
    
    const trackingNumber = `SHP-${year}-${randomNum}-${checkDigit}`;
    
    // Check if this number already exists
    const { data, error } = await supabase
      .from('packages')
      .select('id')
      .eq('tracking_number', trackingNumber)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking tracking number uniqueness:', error);
      continue;
    }
    
    if (!data) {
      // Number is unique!
      return trackingNumber;
    }
    
    // Collision detected, try again
    console.warn(`Tracking number collision detected: ${trackingNumber}, retrying...`);
  }
  
  // Fallback to timestamp-based if all random attempts failed
  const timestamp = Date.now().toString().slice(-6);
  console.warn('Using timestamp-based tracking number as fallback');
  return `SHP-${year}-${timestamp}-0`;
}

// ============ UTILITY FUNCTIONS ============

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return 'Invalid date';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ============ GLOBAL EXPORTS ============

if (typeof window !== 'undefined') {
  window.AppAPI = {
    // Auth
    checkAuth,
    requireAuth,
    signUp,
    signIn,
    signOut,
    
    // Database
    getPackages,
    getPackageById,
    addPackage,
    addTrackingHistory,
    updatePackageStatus,
    searchPackages,
    
    // Utilities
    generateTrackingNumber,
    formatDate,
    escapeHtml,
  };
}

console.log('✅ App.js initialized successfully');
