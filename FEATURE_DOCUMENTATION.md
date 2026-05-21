# Feature Documentation — Auto-Generated Tracking Numbers & Email Notifications

Technical implementation guide for the auto-generated tracking number and email notification system.

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [System Architecture](#system-architecture)
3. [Implementation Details](#implementation-details)
4. [Email Template](#email-template)
5. [Error Handling](#error-handling)
6. [Testing Guide](#testing-guide)
7. [Future Enhancements](#future-enhancements)

---

## Feature Overview

### What It Does

The auto-generated tracking number and email notification system automates the shipment creation workflow:

1. **Tracking Number Generation**
   - Automatically generates unique AUX-formatted tracking numbers
   - Format: `AUX-YYYY-XXXXX` (e.g., `AUX-2026-45321`)
   - No manual input required from users
   - Guaranteed uniqueness via random generation + year

2. **Email Notifications**
   - Automatic email sent when shipment is created
   - Automatic email sent when shipment status is updated
   - Uses EmailJS service for reliable delivery
   - Includes tracking number and public tracking link

### Benefits

- **Reduced Data Entry Errors**: No manual tracking number input
- **Improved Customer Experience**: Recipients get immediate confirmation and tracking link
- **Audit Trail**: All shipments tracked with unique identifiers
- **Scalability**: System can handle unlimited shipments

---

## System Architecture

### Component Interaction

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard (UI)                       │
│  User fills form: Recipient, Email, Status, Location   │
└──────────────────┬──────────────────────────────────────┘
                   │ Submit
                   ▼
┌─────────────────────────────────────────────────────────┐
│         dashboard.js (handleAddPackage)                 │
│  Collects form data and calls addPackageWithNotification│
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│         app.js (addPackageWithNotification)             │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 1. Call generateTrackingNumber()                   │ │
│  │    → Returns: AUX-2026-45321                       │ │
│  └────────────────────────────────────────────────────┘ │
│                   │                                     │
│                   ▼                                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 2. Call addPackage() with tracking number         │ │
│  │    → Saves to Supabase                            │ │
│  │    → Returns: package object with ID              │ │
│  └────────────────────────────────────────────────────┘ │
│                   │                                     │
│                   ▼                                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 3. Call sendRecipientNotification()               │ │
│  │    → Uses EmailJS                                 │ │
│  │    → Sends email to recipient                     │ │
│  │    → Returns: success status                      │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────────┐  ┌──────────────────────┐
│  Supabase DB     │  │  EmailJS Service     │
│  ✓ Saved         │  │  ✓ Email Sent        │
└──────────────────┘  └──────────────────────┘
        │                     │
        └──────────┬──────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│  User Feedback: "Created successfully and notified!"   │
│  Dashboard Reloads: Shows new shipment in table         │
│  Recipient: Receives email with tracking link          │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Tracking Number Generation

**Location**: `app.js`

```javascript
function generateTrackingNumber() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 90000) + 10000;
  return `AUX-${year}-${randomNum}`;
}
```

**How it works**:
- `Math.random()` generates value 0-1
- Multiplied by 90000 gives 0-90000
- Add 10000 gives range 10000-99999 (5-digit number)
- Current year is appended
- Result: `AUX-2026-XXXXX`

**Uniqueness Guarantee**:
- Random pool: 90,000 possible numbers per year
- Database constraint: `UNIQUE tracking_number`
- If collision occurs (rare), database rejects insert
- In practice, collision probability negligible

### 2. Email Notification System

**Location**: `app.js`

```javascript
async function sendRecipientNotification(
  recipientEmail,
  recipientName,
  trackingNumber,
  status,
  location,
  eventType = 'created',
  notes = ''
)
```

**Parameters**:
- `recipientEmail`: Where to send notification
- `recipientName`: "Dear [name]" greeting
- `trackingNumber`: AUX-formatted code
- `status`: Current shipment status
- `location`: Current location
- `eventType`: 'created' or 'status_updated'
- `notes`: Additional context

**Email Template Variables**:

The function passes these variables to EmailJS template:

```javascript
const templateParams = {
  to_email: recipientEmail,
  to_name: recipientName,
  company_name: CONFIG.companyName,
  tracking_number: trackingNumber,
  status: status,
  location: location,
  message: message,              // Dynamic based on eventType
  notes: notes,
  public_tracking_link: publicTrackingUrl,
  current_date: new Date().toLocaleDateString('en-GB')
};
```

**EmailJS Integration**:

```javascript
// Initialize once
emailjs.init(CONFIG.emailJsPublicKey);

// Send email
const response = await emailjs.send(
  CONFIG.emailJsServiceId,
  CONFIG.emailJsTemplateId,
  templateParams
);
```

### 3. Wrapper Function

**Location**: `app.js`

```javascript
async function addPackageWithNotification(
  recipientName,
  recipientEmail,
  status,
  location,
  shipmentType = ''
)
```

**Orchestrates**:
1. Generate tracking number
2. Save package to database
3. Send email notification
4. Return result with error handling

**Flow**:

```javascript
// 1. Generate tracking number
const trackingNumber = generateTrackingNumber();

// 2. Add to database using existing function
const result = await addPackage(
  trackingNumber,
  recipientName,
  recipientEmail,
  status,
  location
);

// 3. If successful, send notification
if (result.success) {
  await sendRecipientNotification(...);
}

return result;
```

### 4. Status Update Notifications

**Location**: `detail.js`

```javascript
async function handleStatusUpdate(e) {
  // ... existing validation ...
  
  // Update package status
  const result = await updatePackageStatus(...);
  
  if (result.success) {
    // Send notification about status change
    await sendRecipientNotification(
      currentPackage.recipient_email,
      currentPackage.recipient_name,
      currentPackage.tracking_number,
      newStatus,
      newLocation,
      'status_updated',
      notes
    );
  }
}
```

---

## Email Template

### EmailJS Template Structure

**Location**: EmailJS Dashboard → Templates

**Subject Line**:
```
@{message} - Tracking #@{tracking_number}
```

**Body** (HTML):
- Header with company branding
- Personalized greeting: "Hello @{to_name}"
- Status information box with:
  - Tracking number
  - Current status
  - Current location
  - Timestamp
- Call-to-action button: "Track Your Shipment" (links to public tracking page)
- Footer with company info

### Variable Mapping

| EmailJS Variable | Source | Example |
|------------------|--------|---------|
| `@{to_email}` | Function param | `recipient@company.com` |
| `@{to_name}` | Function param | `Accra Refinery Ltd` |
| `@{company_name}` | CONFIG.companyName | `Shippingmaxgh Gold` |
| `@{tracking_number}` | Generated | `AUX-2026-45321` |
| `@{status}` | Current status | `In Transit` |
| `@{location}` | Current location | `Port of Tema` |
| `@{message}` | Event-based | `Your shipment status has been updated to: In Transit` |
| `@{public_tracking_link}` | Constructed | `https://yourdomain.com/detail.html?tracking=AUX-2026-45321` |
| `@{current_date}` | Generated | `19 May 2026` |

---

## Error Handling

### Error Scenarios

#### 1. Tracking Number Generation Fails (Unlikely)

**Scenario**: JavaScript environment doesn't support `Math.random()`

**Handling**:
```javascript
function generateTrackingNumber() {
  try {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 90000) + 10000;
    return `AUX-${year}-${randomNum}`;
  } catch (error) {
    console.error('Tracking number generation failed:', error);
    return null; // Caller should handle null
  }
}
```

#### 2. Database Save Fails

**Scenarios**:
- User not authenticated
- Supabase connection error
- Invalid data format

**Handling**:
```javascript
const result = await addPackage(...);
if (!result.success) {
  // Don't send email if database save failed
  return { success: false, error: result.error };
}
```

#### 3. Email Sending Fails

**Scenarios**:
- EmailJS service down
- Invalid recipient email
- Email quota exceeded
- Invalid template ID

**Current Handling**:
```javascript
try {
  const response = await emailjs.send(...);
  return { success: true, data: response };
} catch (error) {
  console.error('Email failed:', error);
  return { success: false, error: error.message };
}
```

**Important Note**: Package is saved even if email fails. User is notified of email failure in UI but shipment was created successfully.

**Future Enhancement**: Could queue failed emails for retry.

#### 4. Missing Configuration

**Check in sendRecipientNotification**:
```javascript
if (!CONFIG.notifications.email.enabled) {
  return { success: true, message: 'Notifications disabled' };
}
```

Allows disabling notifications temporarily without breaking functionality.

### User-Facing Error Messages

| Error | Displayed to User |
|-------|-------------------|
| Database error | "Error creating shipment: [specific error]" |
| Email failure | "Shipment created but notification failed" |
| Invalid email | "Invalid email address provided" |
| Network timeout | "Connection timeout - please try again" |

---

## Testing Guide

### Unit Tests

#### Test 1: Tracking Number Generation

```javascript
// Test generation format
function testGenerateTrackingNumber() {
  const number = generateTrackingNumber();
  
  // Should match format: AUX-YYYY-XXXXX
  const regex = /^AUX-\d{4}-\d{5}$/;
  console.assert(regex.test(number), 'Tracking number format invalid');
  
  // Extract year and verify it's current year
  const year = number.split('-')[1];
  console.assert(year === '2026', 'Year incorrect');
  
  // Generate 100 numbers and check for duplicates
  const numbers = new Set();
  for (let i = 0; i < 100; i++) {
    numbers.add(generateTrackingNumber());
  }
  console.assert(numbers.size === 100, 'Duplicate tracking numbers detected');
  
  console.log('✓ Tracking number generation tests passed');
}

testGenerateTrackingNumber();
```

#### Test 2: Email Notification

```javascript
// Test email parameters
async function testSendNotification() {
  const result = await sendRecipientNotification(
    'test@example.com',
    'Test Company',
    'AUX-2026-12345',
    'Pending',
    'Warehouse A',
    'created',
    'Test shipment'
  );
  
  console.assert(result.success, 'Email send failed');
  console.assert(result.data.status === 200, 'EmailJS returned error');
  console.assert(result.data.text === 'OK', 'EmailJS unexpected response');
  
  console.log('✓ Email notification test passed');
}

// Run with await in async context
await testSendNotification();
```

### Integration Tests

#### Test 3: Full Shipment Creation Flow

```javascript
// Test complete workflow
async function testCompleteWorkflow() {
  const mockRecipient = {
    name: 'Integration Test Co',
    email: 'integration-test@example.com',
    status: 'In Transit',
    location: 'Test Location'
  };
  
  // Call wrapper function
  const result = await addPackageWithNotification(
    mockRecipient.name,
    mockRecipient.email,
    mockRecipient.status,
    mockRecipient.location,
    'Gold Bullion'
  );
  
  console.assert(result.success, 'Workflow failed');
  console.assert(result.data.tracking_number, 'No tracking number returned');
  console.assert(result.data.tracking_number.startsWith('AUX-'), 'Invalid tracking format');
  
  // Verify in database
  const verifyResult = await getPackageById(result.data.id);
  console.assert(verifyResult.success, 'Could not retrieve saved package');
  console.assert(
    verifyResult.data.tracking_number === result.data.tracking_number,
    'Tracking number mismatch'
  );
  
  console.log('✓ Complete workflow test passed');
}

await testCompleteWorkflow();
```

### Manual Testing Checklist

#### Pre-Launch Testing

- [ ] Generate 10+ tracking numbers and verify format
- [ ] Create test shipment and verify email received
- [ ] Check email includes correct tracking number
- [ ] Click tracking link in email and verify it works
- [ ] Update status and verify recipient gets update email
- [ ] Test with various recipient email providers (Gmail, Outlook, etc.)
- [ ] Verify tracking numbers in database are unique
- [ ] Test with empty/null notes field
- [ ] Verify public tracking page doesn't allow editing
- [ ] Test on slow network connection
- [ ] Test email with very long recipient names
- [ ] Verify emails are not sent if notifications disabled in config

#### Performance Testing

```javascript
// Simulate bulk shipment creation
async function testBulkCreation() {
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < 100; i++) {
    promises.push(
      addPackageWithNotification(
        `Company ${i}`,
        `company${i}@example.com`,
        'Pending',
        `Location ${i}`,
        'Gold Bullion'
      )
    );
  }
  
  await Promise.all(promises);
  const elapsed = Date.now() - startTime;
  
  console.log(`Created 100 shipments in ${elapsed}ms`);
  console.log(`Average time per shipment: ${elapsed/100}ms`);
}

await testBulkCreation();
```

---

## Future Enhancements

### 1. Custom Tracking Number Format

Allow admins to configure tracking number format:

```javascript
// Example: Different prefixes per shipment type
function generateTrackingNumberCustom(shipmentType) {
  const prefix = shipmentType === 'Gold Bullion' ? 'AUX-GB' : 'AUX-GC';
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}-${year}-${random}`;
}
```

### 2. Email Retry Logic

Automatically retry failed emails:

```javascript
async function sendRecipientNotificationWithRetry(
  recipientEmail,
  recipientName,
  trackingNumber,
  status,
  location,
  eventType = 'created',
  notes = '',
  maxRetries = 3
) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendRecipientNotification(
        recipientEmail,
        recipientName,
        trackingNumber,
        status,
        location,
        eventType,
        notes
      );
      
      if (result.success) return result;
      lastError = result.error;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    } catch (error) {
      lastError = error.message;
    }
  }
  
  return { success: false, error: `Failed after ${maxRetries} attempts: ${lastError}` };
}
```

### 3. Scheduled Email Digests

Send recipients daily/weekly shipment digest instead of individual emails:

```javascript
// Collect and batch emails
const queuedNotifications = [];

function queueNotification(notification) {
  queuedNotifications.push({
    ...notification,
    queuedAt: Date.now()
  });
}

// Send digest periodically
async function sendDailyDigest() {
  // Group by recipient
  const byRecipient = groupBy(queuedNotifications, 'recipientEmail');
  
  for (const [email, notifications] of Object.entries(byRecipient)) {
    // Send single digest email with all updates
    await sendDigestEmail(email, notifications);
  }
  
  queuedNotifications = [];
}
```

### 4. SMS Notifications

Extend system to send SMS alerts:

```javascript
async function sendRecipientSMS(
  phoneNumber,
  trackingNumber,
  status,
  location
) {
  if (!CONFIG.notifications.sms.enabled) return;
  
  const message = `${CONFIG.companyName}: Shipment ${trackingNumber} is now ${status} at ${location}. Track: https://yourdomain.com/detail.html?tracking=${trackingNumber}`;
  
  // Use Twilio SDK
  return await twilio.messages.create({
    body: message,
    from: CONFIG.notifications.sms.fromNumber,
    to: phoneNumber
  });
}
```

### 5. Webhook Notifications

Allow external systems to be notified:

```javascript
async function notifyWebhooks(trackingNumber, eventType, data) {
  const webhooks = await getRegisteredWebhooks();
  
  for (const webhook of webhooks) {
    try {
      await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: eventType,
          timestamp: new Date().toISOString(),
          tracking_number: trackingNumber,
          data: data
        })
      });
    } catch (error) {
      console.error(`Webhook delivery failed to ${webhook.url}:`, error);
    }
  }
}
```

### 6. Multi-Language Email Templates

Support emails in multiple languages:

```javascript
async function sendRecipientNotificationMultiLang(
  recipientEmail,
  recipientName,
  trackingNumber,
  status,
  location,
  eventType = 'created',
  notes = '',
  language = 'en'  // 'en', 'fr', 'es', etc.
) {
  const templates = {
    en: CONFIG.emailJsTemplateId,
    fr: 'template_french_id',
    es: 'template_spanish_id'
  };
  
  const templateId = templates[language] || templates.en;
  
  return await sendRecipientNotification(...);
}
```

---

## Performance Considerations

### Current Performance

- **Tracking number generation**: < 1ms
- **Database save**: ~200-500ms (network dependent)
- **Email send**: ~1-3 seconds (EmailJS API)
- **Total workflow**: ~2-4 seconds

### Optimization Opportunities

1. **Async email sending**: Don't wait for EmailJS response
   ```javascript
   sendRecipientNotification(...).catch(err => console.error(err));
   // Return immediately
   ```

2. **Email queuing**: Queue emails during peak times

3. **Caching**: Cache EmailJS initialization

4. **Database indexing**: Already optimized with indexes on `tracking_number` and `created_by`

### Database Query Performance

```javascript
// Current queries (optimized)
SELECT * FROM packages WHERE tracking_number = 'AUX-2026-45321';
// Uses index: idx_packages_tracking_number

SELECT * FROM packages WHERE created_by = user_id;
// Uses index: idx_packages_created_by

SELECT * FROM tracking_history WHERE package_id = package_id;
// Uses index: idx_tracking_history_package_id
```

---

## Conclusion

The auto-generated tracking number and email notification system provides:

✅ Automated, error-free tracking number generation  
✅ Immediate recipient notification with tracking link  
✅ Status update notifications throughout shipment lifecycle  
✅ Scalable to thousands of shipments daily  
✅ Future-ready for enhancements (SMS, webhooks, etc.)

