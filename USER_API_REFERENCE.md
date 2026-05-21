# User & API Reference — Shippingmaxgh Gold

Complete reference guide for end users and developers.

## Table of Contents

1. [For Operations Team (Users)](#for-operations-team-users)
2. [For Recipients (Public Tracking)](#for-recipients-public-tracking)
3. [API Reference](#api-reference)
4. [Tracking Number Format](#tracking-number-format)

---

## For Operations Team (Users)

### Login

1. Go to dashboard login page
2. Enter your email and password
3. Click **"Sign In to Portal"**
4. You're logged in for 30 days (session management)

### Creating a Shipment

1. Click **"+ Log New Shipment"** button
2. Fill in the form:
   - **Consignee / Recipient**: Name of receiving company
   - **Recipient Email**: Email address for notifications
   - **Shipment Type**: Select from dropdown (Gold Bullion, Coins, etc.)
   - **Initial Status**: Current shipment status
   - **Current Location / Origin**: Starting location

3. Click **"Create Shipment Record"**
4. System will:
   - Auto-generate unique tracking number (AUX-2026-XXXXX)
   - Save to database
   - Send email to recipient with tracking details

**Note**: Tracking numbers are automatically generated. Do not attempt to create custom numbers.

### Viewing Shipment Details

From dashboard:
1. Click **"View"** button on any shipment row
2. Opens detail page showing:
   - Tracking number
   - Recipient information
   - Current status and location
   - Full tracking timeline
   - Last update timestamp

### Updating Shipment Status

1. From detail page, click **"Update"** button
2. Fill in update form:
   - **New Status**: Select new status (Pending, In Transit, Out for Delivery, Delivered)
   - **New Location**: Current location
   - **Notes** (optional): Add update notes (e.g., "Weather delay", "Customs cleared")

3. Click **"Save Changes"**
4. System will:
   - Update database
   - Send email to recipient
   - Add entry to tracking timeline

### Searching Shipments

Use the search bar to find shipments:
- Search by **tracking number** (e.g., "AUX-2026")
- Search by **recipient name** (e.g., "Accra Refinery")

### Filtering Shipments

Filter by status using the dropdown:
- **Pending**: Not yet in transit
- **In Transit**: Currently being transported
- **Out for Delivery**: Final delivery stage
- **Delivered**: Successfully delivered

### Exporting Data

To export shipment data:
1. Use browser print function (Ctrl+P / Cmd+P)
2. Select "Save as PDF"
3. Or copy table data and paste to Excel

### Logging Out

Click **"Sign Out"** button in top right corner

---

## For Recipients (Public Tracking)

### How Recipients Access Tracking

Recipients receive email with:
- Tracking number
- Link to public tracking page
- Public tracking link format: `https://yourdomain.com/detail.html?tracking=AUX-2026-45321`

### Viewing Tracking Status

1. Click link in email
2. Page shows:
   - Shipment reference number
   - Current status and location
   - Full tracking history (timeline)
   - Last update timestamp

**Note**: Public tracking is read-only. Recipients cannot modify information.

### Email Notifications

Recipients receive emails:

1. **When shipment is created**
   - Confirms receipt in system
   - Provides tracking number
   - Link to track online

2. **When shipment status updates**
   - New status (In Transit, Out for Delivery, etc.)
   - Current location
   - Any notes from logistics team
   - Updated tracking link

### Contacting Support

If recipients have questions:
- Email: contact@shippingmaxgh.com
- Website: https://shippingmaxgh.com
- Phone: +233 XXX XXX XXXX

---

## API Reference

### Core Functions

#### Authentication Functions

```javascript
// Check if user has active session
const session = await checkAuth();
// Returns: session object or null

// Require authentication (redirects if not logged in)
await requireAuth();

// Sign up new user
const result = await signUp(email, password);
// Returns: { success: bool, data/error: string }

// Sign in user
const result = await signIn(email, password);
// Returns: { success: bool, data/error: string }

// Sign out user
const result = await signOut();
// Returns: { success: bool, error: string }
```

#### Tracking Number Generation

```javascript
// Generate unique tracking number
const trackingNumber = generateTrackingNumber();
// Format: AUX-2026-45321
// Returns: string
```

#### Package Functions

```javascript
// Get all packages for current user
const result = await getPackages();
// Returns: { success: bool, data: [packages], error: string }

// Get specific package by ID
const result = await getPackageById(packageId);
// Returns: { success: bool, data: package, error: string }

// Create new package WITH auto-generated tracking number and notification
const result = await addPackageWithNotification(
  recipientName,
  recipientEmail,
  status,
  location,
  shipmentType
);
// Returns: { success: bool, data: package, error: string }
// Side effects: Sends email notification

// Update package status
const result = await updatePackageStatus(
  packageId,
  newStatus,
  newLocation,
  notes
);
// Returns: { success: bool, data: package, error: string }

// Search packages
const result = await searchPackages(query);
// Query matches: tracking_number OR recipient_name
// Returns: { success: bool, data: [packages], error: string }
```

#### Tracking History Functions

```javascript
// Add tracking update to package
const result = await addTrackingHistory(
  packageId,
  status,
  location,
  notes
);
// Returns: { success: bool, data: history, error: string }
```

#### Email Notification Functions

```javascript
// Send email notification to recipient
const result = await sendRecipientNotification(
  recipientEmail,
  recipientName,
  trackingNumber,
  status,
  location,
  eventType,      // 'created' or 'status_updated'
  notes            // optional
);
// Returns: { success: bool, data: emailjs_response, error: string }
// EmailJS must be initialized and configured
```

### Supabase Client

```javascript
// Direct Supabase client access (advanced)
const supabase = window.supabase.createClient(
  CONFIG.supabaseUrl,
  CONFIG.supabaseAnonKey
);

// Query examples
const { data, error } = await supabase
  .from('packages')
  .select('*')
  .eq('status', 'Delivered');
```

### Error Handling

All API functions return consistent response format:

```javascript
// Success response
{
  success: true,
  data: { /* response data */ }
}

// Error response
{
  success: false,
  error: "Error message describing what went wrong"
}
```

**Best practice**: Always check `result.success` before using `result.data`

```javascript
const result = await getPackages();
if (result.success) {
  console.log('Packages:', result.data);
} else {
  console.error('Error:', result.error);
}
```

---

## Tracking Number Format

### Format Specification

```
AUX-YYYY-XXXXX
│   │   │
│   │   └─ Random 5-digit number (10000-99999)
│   └───── Current year (2026, 2027, etc.)
└───────── Company prefix (always AUX for Aurex Gold)
```

### Examples

- `AUX-2026-45321` – Valid
- `AUX-2026-10000` – Valid (minimum)
- `AUX-2026-99999` – Valid (maximum)
- `AUX-2025-12345` – Valid (previous year if created during year transition)

### Uniqueness

- Tracking numbers are **guaranteed unique**
- Uses UUID database backend for collision avoidance
- If collision occurs (unlikely), system generates new number automatically

### Generation Algorithm

```javascript
function generateTrackingNumber() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 90000) + 10000;
  return `AUX-${year}-${randomNum}`;
}
```

---

## Database Schema

### packages Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tracking_number` | TEXT | AUX-formatted code (unique) |
| `recipient_name` | TEXT | Consignee name |
| `recipient_email` | TEXT | Recipient email address |
| `status` | TEXT | Current status |
| `location` | TEXT | Current location |
| `created_at` | TIMESTAMP | Creation time (auto) |
| `created_by` | UUID | User who created (auto) |
| `shipment_type` | TEXT | Type of shipment |

**Indexes**:
- `idx_packages_tracking_number` – Fast lookup by tracking
- `idx_packages_created_by` – Fast lookup by user

### tracking_history Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `package_id` | UUID | Foreign key to packages |
| `status` | TEXT | Status at this point |
| `location` | TEXT | Location at this point |
| `notes` | TEXT | Update notes |
| `created_at` | TIMESTAMP | Update time (auto) |
| `created_by` | UUID | User who made update (auto) |

**Indexes**:
- `idx_tracking_history_package_id` – Fast lookup by package
- `idx_tracking_history_created_at` – Fast lookup by date

---

## Common Tasks

### Create and Notify a Shipment

```javascript
// One function call handles everything
const result = await addPackageWithNotification(
  'Accra Refinery Ltd',
  'logistics@accra-refinery.com',
  'Pending',
  'Vault A, Accra',
  'Gold Bullion'
);

if (result.success) {
  console.log('Shipment created with tracking:', result.data.tracking_number);
  console.log('Recipient notified at:', result.data.recipient_email);
} else {
  console.error('Failed:', result.error);
}
```

### Search and Update Shipment

```javascript
// Find a shipment
const searchResult = await searchPackages('AUX-2026-45321');

if (searchResult.success && searchResult.data.length > 0) {
  const shipment = searchResult.data[0];
  
  // Update its status
  const updateResult = await updatePackageStatus(
    shipment.id,
    'In Transit',
    'Port of Tema, Ghana',
    'Cleared customs, en route'
  );
  
  if (updateResult.success) {
    console.log('Updated and notified recipient');
  }
}
```

### Get Full Shipment Timeline

```javascript
const result = await getPackageById(packageId);

if (result.success) {
  const pkg = result.data;
  const timeline = pkg.tracking_history;
  
  timeline.forEach(entry => {
    console.log(`${entry.status} at ${entry.location} on ${entry.created_at}`);
  });
}
```

---

## Email Variables Reference

When sending notifications, these variables are available in the email template:

| Variable | Example | Description |
|----------|---------|-------------|
| `@{to_name}` | John Doe | Recipient's name |
| `@{to_email}` | john@example.com | Recipient's email |
| `@{company_name}` | Shippingmaxgh Gold | Your company name |
| `@{tracking_number}` | AUX-2026-45321 | Shipment tracking number |
| `@{status}` | In Transit | Current shipment status |
| `@{location}` | Port of Tema | Current location |
| `@{message}` | Your shipment has been created | Event message |
| `@{notes}` | Weather delay noted | Additional notes |
| `@{public_tracking_link}` | https://yourdomain.com/detail.html?tracking=AUX-2026-45321 | Link for recipient to track |
| `@{current_date}` | 19 May 2026 | Current date |

---

## Troubleshooting

### "Tracking number already exists"

This is extremely rare due to random generation. Solution:
1. Generate new number manually (unlikely needed)
2. Report to support if recurring

### Email not received by recipient

Possible causes:
1. Email address typo – verify in database
2. Email provider spam filter – check spam/promotions folder
3. EmailJS quota exceeded – upgrade plan
4. Service temporarily down – check EmailJS status

### Session expired during form submission

Solution:
1. Refresh page
2. Log in again
3. Retry action

Cause: Session timeout is 30 days. For extended sessions, update in Supabase auth settings.

### Can't update status

Possible causes:
1. User permission – only creator can edit (via RLS)
2. Database connection issue
3. Package doesn't exist

---

## Performance Tips

- **Large result sets**: Use filters before querying
- **Real-time updates**: Supabase subscriptions (advanced feature)
- **Offline support**: Consider service workers for offline access (future enhancement)

---

## Version Information

- **Current Version**: 1.0
- **Release Date**: May 2026
- **Compatible Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Node Version** (if deploying): 18+ recommended

---

## Support

For issues or questions:
- Check [SETUP.md](SETUP.md) for configuration help
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment issues
- Review error messages in browser console (F12)
- Check Supabase and EmailJS dashboards for service status

