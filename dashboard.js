/**
 * ShippingMax — Dashboard page logic (FIXED VERSION)
 * Uses centralized EmailService and global supabaseClient
 */

let currentPackages = [];
let filteredPackages = [];

async function initDashboard() {
  // Ensure Supabase is initialized
  if (typeof window.ensureSupabaseInitialized === 'function') {
    window.ensureSupabaseInitialized();
  }
  
  // Use global client from app.js
  const supabase = window.supabaseClient;
  
  if (!supabase) {
    showError('Application not initialized properly. Please refresh the page. (Missing Supabase client)');
    console.error('Supabase client not available. Check that config.js and app.js are loaded correctly.');
    console.error('Expected window.supabaseClient to be initialized.');
    return;
  }

  try {
    // Check authentication
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Auth error:', error);
      showError(`Authentication error: ${error.message}`);
      return;
    }
    
    if (!session) {
      window.location.href = 'index.html';
      return;
    }

    // Display user email
    document.getElementById('userEmail').textContent = session.user.email;

    // Setup event listeners
    setupEventListeners();

    // Load packages
    await loadPackages();
  } catch (error) {
    console.error('Dashboard initialization error:', error);
    showError(`Initialization error: ${error.message}`);
  }
}

function setupEventListeners() {
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  
  document.getElementById('showAddForm').addEventListener('click', () => {
    document.getElementById('addPackageForm').classList.remove('hidden');
    document.getElementById('packageForm').reset();
    // Auto-generate tracking number
    generateAndSetTrackingNumber();
  });
  
  document.getElementById('cancelAddForm').addEventListener('click', () => {
    document.getElementById('addPackageForm').classList.add('hidden');
  });
  
  document.getElementById('packageForm').addEventListener('submit', handleAddPackage);
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('statusFilter').addEventListener('change', handleFilter);
  document.getElementById('clearFilters').addEventListener('click', clearFilters);
  
  const createFirstBtn = document.getElementById('createFirstPackage');
  if (createFirstBtn) {
    createFirstBtn.addEventListener('click', () => {
      document.getElementById('showAddForm').click();
    });
  }
}

async function generateAndSetTrackingNumber() {
  try {
    const trackingNumber = await window.AppAPI.generateTrackingNumber();
    const trackingInput = document.getElementById('trackingNumber');
    if (trackingInput) {
      trackingInput.value = trackingNumber;
    }
  } catch (error) {
    console.error('Error generating tracking number:', error);
  }
}

async function loadPackages() {
  const supabase = window.supabaseClient;
  const tableBody = document.getElementById('packagesTable');
  
  // Show loading state
  tableBody.innerHTML = '<tr class="loading"><td colspan="6">Loading shipments...</td></tr>';

  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*, tracking_history(id, status, location, notes, created_at)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    currentPackages = data || [];
    filteredPackages = [...currentPackages];
    
    updateStats(currentPackages);
    renderPackages();
  } catch (error) {
    console.error('Error loading packages:', error);
    tableBody.innerHTML = `<tr><td colspan="6" class="error">Error loading shipments: ${error.message}</td></tr>`;
  }
}

function updateStats(packages) {
  const getElement = (id) => document.getElementById(id);
  
  if (getElement('statTotal')) {
    getElement('statTotal').textContent = packages.length;
  }
  
  if (getElement('statPending')) {
    getElement('statPending').textContent = packages.filter(p => p.status === 'Pending').length;
  }
  
  if (getElement('statTransit')) {
    getElement('statTransit').textContent = packages.filter(p => 
      p.status === 'In Transit' || p.status === 'Out for Delivery'
    ).length;
  }
  
  if (getElement('statDelivered')) {
    getElement('statDelivered').textContent = packages.filter(p => p.status === 'Delivered').length;
  }
}

function renderPackages() {
  const tableBody = document.getElementById('packagesTable');
  const emptyState = document.getElementById('emptyState');

  if (filteredPackages.length === 0) {
    tableBody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  tableBody.innerHTML = filteredPackages.map(pkg => {
    const lastUpdate = pkg.tracking_history && pkg.tracking_history.length > 0
      ? new Date(pkg.tracking_history[0].created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      : new Date(pkg.created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

    const statusClass = `status-${pkg.status.toLowerCase().replace(/\s+/g, '-')}`;

    return `
      <tr>
        <td><strong>${window.AppAPI.escapeHtml(pkg.tracking_number)}</strong></td>
        <td>${window.AppAPI.escapeHtml(pkg.recipient_name)}</td>
        <td><span class="status-badge ${statusClass}">${window.AppAPI.escapeHtml(pkg.status)}</span></td>
        <td>${window.AppAPI.escapeHtml(pkg.location || '')}</td>
        <td>${lastUpdate}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-secondary btn-small" onclick="viewPackage('${pkg.id}')">View</button>
            <button class="btn btn-primary btn-small" onclick="editPackage('${pkg.id}')">Update</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleAddPackage(e) {
  e.preventDefault();
  const supabase = window.supabaseClient;
  
  const trackingNumber = document.getElementById('trackingNumber')?.value.trim() || await window.AppAPI.generateTrackingNumber();
  const recipientName = document.getElementById('recipientName').value.trim();
  const recipientEmail = document.getElementById('recipientEmail').value.trim();
  const status = document.getElementById('initialStatus').value;
  const location = document.getElementById('initialLocation').value.trim();
  const shipmentType = document.getElementById('shipmentType')?.value || null;
  
  const messageEl = document.getElementById('addFormMessage');

  // Validate inputs
  if (!recipientName || !recipientEmail || !status || !location) {
    showMessage(messageEl, 'error', 'Please fill in all required fields');
    return;
  }

  if (!window.EmailService.isValidEmail(recipientEmail)) {
    showMessage(messageEl, 'error', 'Please enter a valid email address');
    return;
  }

  showMessage(messageEl, 'info', 'Creating shipment...');

  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showMessage(messageEl, 'error', 'Not authenticated');
      return;
    }

    // Create package
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .insert([{
        tracking_number: trackingNumber,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        status,
        location,
        shipment_type: shipmentType,
        created_by: session.user.id
      }])
      .select()
      .single();

    if (packageError) {
      if (packageError.code === '23505') {
        showMessage(messageEl, 'error', 'This tracking number already exists');
      } else {
        showMessage(messageEl, 'error', `Error: ${packageError.message}`);
      }
      return;
    }

    // Add tracking history
    await supabase.from('tracking_history').insert([{
      package_id: packageData.id,
      status,
      location,
      notes: 'Shipment created',
      created_by: session.user.id
    }]);

    // Send email notification using centralized service
    const emailResult = await window.EmailService.sendShipmentCreated(
      packageData,
      `New ${shipmentType || 'gold'} shipment registered`
    );

    if (emailResult.success) {
      showMessage(messageEl, 'success', 'Shipment created and notification sent!');
    } else if (emailResult.requiresAdminAction) {
      showMessage(messageEl, 'warning', 'Shipment created! ⚠️ Email failed - Admin must reconnect Gmail in EmailJS');
      console.error('Admin action required:', emailResult.error);
    } else if (!emailResult.silent) {
      showMessage(messageEl, 'warning', 'Shipment created, but email notification failed. Recipient may need to be notified manually.');
      console.warn('Email error:', emailResult.error);
    } else {
      showMessage(messageEl, 'success', 'Shipment created successfully!');
    }

    // Reset form and reload
    document.getElementById('packageForm').reset();
    setTimeout(() => {
      document.getElementById('addPackageForm').classList.add('hidden');
      loadPackages();
    }, 1500);
    
  } catch (error) {
    console.error('Error creating package:', error);
    showMessage(messageEl, 'error', `Error: ${error.message}`);
  }
}

function showMessage(element, type, text) {
  if (!element) return;
  element.className = `message ${type}`;
  element.textContent = text;
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'message error';
  errorDiv.textContent = message;
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '20px';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translateX(-50%)';
  errorDiv.style.zIndex = '9999';
  document.body.appendChild(errorDiv);
  
  setTimeout(() => errorDiv.remove(), 5000);
}

function viewPackage(packageId) {
  window.location.href = `detail.html?id=${packageId}`;
}

function editPackage(packageId) {
  window.location.href = `detail.html?id=${packageId}&edit=true`;
}

// Expose package actions to inline event handlers in module scope
window.viewPackage = viewPackage;
window.editPackage = editPackage;

function handleSearch() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  
  if (!query) {
    filteredPackages = [...currentPackages];
  } else {
    filteredPackages = currentPackages.filter(pkg =>
      pkg.tracking_number.toLowerCase().includes(query) ||
      pkg.recipient_name.toLowerCase().includes(query) ||
      (pkg.recipient_email && pkg.recipient_email.toLowerCase().includes(query))
    );
  }
  
  renderPackages();
}

function handleFilter() {
  const status = document.getElementById('statusFilter').value;
  
  if (!status) {
    filteredPackages = [...currentPackages];
  } else {
    filteredPackages = currentPackages.filter(pkg => pkg.status === status);
  }
  
  renderPackages();
}

function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('statusFilter').value = '';
  filteredPackages = [...currentPackages];
  renderPackages();
}

async function handleLogout() {
  const supabase = window.supabaseClient;
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(`Logout error: ${error.message}`);
    } else {
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to logout. Please try again.');
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', initDashboard);
