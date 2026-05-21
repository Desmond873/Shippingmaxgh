/**
 * ShippingMax — Detail page logic (FIXED VERSION)
 * Handles single shipment view, status updates, and tracking timeline
 * Supports public tracking (read-only) and admin editing
 * 
 * CRITICAL FIX: Corrected undefined variables in email sending (lines 215-225)
 */

let currentPackage = null;
let packageId = null;
let isEditMode = false;
let isPublicMode = false;
let _supabase = null;

function getClient() {
  if (!_supabase) {
    // Use global client if available, otherwise create new one
    _supabase = window.supabaseClient || window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
  }
  return _supabase;
}

async function initDetail() {
  const db = getClient();
  const urlParams = new URLSearchParams(window.location.search);
  packageId = urlParams.get('id');
  isEditMode = urlParams.get('edit') === 'true';
  isPublicMode = urlParams.get('public') === 'true';

  if (!packageId) {
    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('errorState').textContent = 'No shipment ID provided.';
    document.getElementById('loadingState').style.display = 'none';
    return;
  }

  if (!isPublicMode) {
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
      window.location.href = 'index.html';
      return;
    }
    document.getElementById('userEmail').textContent = session.user.email;
  }

  // EmailJS initialization is handled globally, don't re-initialize
  // Just verify it's available
  if (!window.emailjs && !isPublicMode) {
    console.warn('EmailJS not available - notifications may fail');
  }

  if (isPublicMode) {
    applyPublicModeUI();
  }

  setupEventListeners();
  await loadPackageDetails();

  if (isEditMode && !isPublicMode) {
    document.getElementById('updateForm').classList.remove('hidden');
  }
}

function applyPublicModeUI() {
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('backBtn').style.display = 'none';
  document.getElementById('publicModeLabel').classList.remove('hidden');
  document.getElementById('publicTrackingInfo').classList.remove('hidden');
  document.getElementById('publicTrackingId').textContent = packageId;
  document.getElementById('showUpdateForm').style.display = 'none';
  document.getElementById('updateForm').style.display = 'none';
}

function setupEventListeners() {
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });

  document.getElementById('showUpdateForm').addEventListener('click', () => {
    document.getElementById('updateForm').classList.remove('hidden');
    document.getElementById('showUpdateForm').classList.add('hidden');
  });

  document.getElementById('cancelUpdate').addEventListener('click', () => {
    document.getElementById('updateForm').classList.add('hidden');
    document.getElementById('showUpdateForm').classList.remove('hidden');
  });

  document.getElementById('statusUpdateForm').addEventListener('submit', handleStatusUpdate);
}

async function loadPackageDetails() {
  const db = getClient();

  const { data, error } = await db
    .from('packages')
    .select('*, tracking_history(id, status, location, notes, created_at)')
    .eq('id', packageId)
    .single();

  if (error) {
    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('errorState').textContent = `Error: ${error.message}`;
    document.getElementById('loadingState').style.display = 'none';
    return;
  }

  currentPackage = data;
  renderPackageDetails();
  renderTimeline();
}

function renderPackageDetails() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('packageHeader').classList.remove('hidden');
  document.getElementById('packageInfo').classList.remove('hidden');

  document.getElementById('trackingNumber').textContent = escapeHtml(currentPackage.tracking_number);
  document.getElementById('recipientName').textContent = escapeHtml(currentPackage.recipient_name);
  document.getElementById('recipientEmail').textContent = escapeHtml(currentPackage.recipient_email || '');

  const statusBadge = document.getElementById('currentStatus');
  statusBadge.className = `status-badge status-${currentPackage.status.toLowerCase().replace(/\s+/g, '-')}`;
  statusBadge.textContent = currentPackage.status;

  document.getElementById('currentLocation').textContent = escapeHtml(currentPackage.location || '');
  document.getElementById('createdDate').textContent = formatDate(currentPackage.created_at);

  const lastUpdate = currentPackage.tracking_history && currentPackage.tracking_history.length > 0
    ? formatDate(currentPackage.tracking_history[0].created_at)
    : formatDate(currentPackage.created_at);
  document.getElementById('lastUpdatedDate').textContent = lastUpdate;

  document.getElementById('newStatus').value = currentPackage.status;
  document.getElementById('newLocation').value = currentPackage.location || '';

  document.title = `ShippingMax — ${currentPackage.tracking_number}`;
}

function renderTimeline() {
  const timeline = document.getElementById('timeline');
  const timelineItems = document.getElementById('timelineItems');

  if (!currentPackage.tracking_history || currentPackage.tracking_history.length === 0) {
    timeline.classList.add('hidden');
    return;
  }

  timeline.classList.remove('hidden');

  const sorted = [...currentPackage.tracking_history].sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );

  timelineItems.innerHTML = sorted.map((entry, index) => {
    const isFirst = index === sorted.length - 1;
    return `
      <div class="timeline-item ${isFirst ? 'completed' : ''}">
        <div class="timeline-content">
          <div class="timeline-status">${escapeHtml(entry.status)}</div>
          <div class="timeline-location">📍 ${escapeHtml(entry.location || '')}</div>
          ${entry.notes ? `<div class="timeline-notes">${escapeHtml(entry.notes)}</div>` : ''}
          <div class="timeline-date">${formatDate(entry.created_at)}</div>
        </div>
      </div>
    `;
  }).join('');
}

async function handleStatusUpdate(e) {
  e.preventDefault();
  const db = getClient();

  const newStatus = document.getElementById('newStatus').value;
  const newLocation = document.getElementById('newLocation').value.trim();
  const notes = document.getElementById('updateNotes').value.trim();
  const messageEl = document.getElementById('updateMessage');

  if (!newStatus || !newLocation) {
    messageEl.className = 'message error';
    messageEl.textContent = 'Status and location are required.';
    return;
  }

  if (newStatus === currentPackage.status && newLocation === currentPackage.location) {
    messageEl.className = 'message error';
    messageEl.textContent = 'Please change the status or location before saving.';
    return;
  }

  messageEl.className = 'message';
  messageEl.textContent = 'Updating shipment...';

  try {
    // Update package
    const { error: updateError } = await db
      .from('packages')
      .update({ status: newStatus, location: newLocation })
      .eq('id', packageId);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    // Add tracking history entry
    const { error: historyError } = await db.from('tracking_history').insert([{
      package_id: packageId,
      status: newStatus,
      location: newLocation,
      notes: notes || null,
    }]);

    if (historyError) {
      throw new Error(`History update failed: ${historyError.message}`);
    }

    // Send email notification on every status update
    // CRITICAL FIX: Use currentPackage properties, not undefined variables
    if (window.emailjs && CONFIG.emailJsServiceId && CONFIG.emailJsTemplateId) {
      try {
        const emailParams = {
          to_email: currentPackage.recipient_email,           // ✅ FIXED: was undefined 'recipientEmail'
          recipient_name: currentPackage.recipient_name,      // ✅ FIXED: was undefined 'recipientName'
          tracking_number: currentPackage.tracking_number,    // ✅ FIXED: was undefined 'trackingNumber'
          status: newStatus,                                  // ✅ FIXED: was undefined 'status'
          location: newLocation,                              // ✅ FIXED: was undefined 'location'
          company_name: CONFIG.companyName,
          current_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          notes: notes || 'Status updated',
          public_tracking_link: `${window.location.origin}/detail.html?id=${packageId}&public=true`,
          message: `Your shipment status has been updated to: ${newStatus}`
        };

        console.log('Sending status update email with params:', emailParams);
        
        const emailResponse = await emailjs.send(
          CONFIG.emailJsServiceId, 
          CONFIG.emailJsTemplateId,
          emailParams
        );
        
        console.log('Status update email sent successfully:', emailResponse);
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the entire operation if email fails
        // Just log it and continue
      }
    } else {
      console.warn('EmailJS not configured - skipping notification');
    }

    messageEl.className = 'message success';
    messageEl.textContent = 'Shipment updated successfully!';

    // Reload the package data to show the update
    setTimeout(() => {
      loadPackageDetails();
      document.getElementById('updateForm').classList.add('hidden');
      document.getElementById('showUpdateForm').classList.remove('hidden');
      document.getElementById('statusUpdateForm').reset();
      messageEl.textContent = '';
    }, 1500);
    
  } catch (error) {
    messageEl.className = 'message error';
    messageEl.textContent = `Error: ${error.message}`;
    console.error('Status update failed:', error);
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

async function handleLogout() {
  const db = getClient();
  const { error } = await db.auth.signOut();
  if (error) {
    alert(`Sign out error: ${error.message}`);
  } else {
    window.location.href = 'index.html';
  }
}

document.addEventListener('DOMContentLoaded', initDetail);
