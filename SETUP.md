# Setup Guide — Shippingmaxgh Gold

Complete step-by-step instructions for configuring the shipment tracker application.

## Table of Contents

1. [Supabase Configuration](#supabase-configuration)
2. [EmailJS Configuration](#emailjs-configuration)
3. [Local Development Setup](#local-development-setup)
4. [Configuration File](#configuration-file)
5. [Troubleshooting](#troubleshooting)

---

## Supabase Configuration

Supabase provides the backend database and authentication for the application.

### Step 1: Create a Supabase Project

1. Visit [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"** (or go to dashboard)
4. Fill in project details:
   - **Name**: `aurex-gold` (or your preference)
   - **Database Password**: Create a strong password (you'll need this for backups)
   - **Region**: Select closest to your users (e.g., Europe, US East)
5. Click **"Create new project"** and wait for initialization (2-3 minutes)

### Step 2: Create Tables

Once your project is ready:

1. In the Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy and paste this SQL:

```sql
-- Create packages table
CREATE TABLE packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_number TEXT UNIQUE NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  location TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  shipment_type TEXT
);

-- Create tracking_history table
CREATE TABLE tracking_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create indexes for better query performance
CREATE INDEX idx_packages_tracking_number ON packages(tracking_number);
CREATE INDEX idx_packages_created_by ON packages(created_by);
CREATE INDEX idx_tracking_history_package_id ON tracking_history(package_id);
CREATE INDEX idx_tracking_history_created_at ON tracking_history(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_history ENABLE ROW LEVEL SECURITY;
```

4. Click **"Run"**
5. You should see "Success: Query executed successfully"

### Step 3: Set Up Row Level Security (RLS)

RLS ensures users only see their own data. Set up policies:

#### For `packages` table:

1. Go to **Authentication** → **Policies**
2. Select **packages** table
3. Click **"New Policy"** → **"For full customization"**

**Policy 1: SELECT (Read own packages)**
```sql
CREATE POLICY "Users can view their packages"
ON packages FOR SELECT
USING (auth.uid() = created_by);
```

**Policy 2: INSERT (Create packages)**
```sql
CREATE POLICY "Users can create packages"
ON packages FOR INSERT
WITH CHECK (auth.uid() = created_by);
```

**Policy 3: UPDATE (Modify packages)**
```sql
CREATE POLICY "Users can update their packages"
ON packages FOR UPDATE
USING (auth.uid() = created_by);
```

#### For `tracking_history` table:

**Policy 1: SELECT**
```sql
CREATE POLICY "Users can view tracking history"
ON tracking_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM packages
    WHERE packages.id = tracking_history.package_id
    AND packages.created_by = auth.uid()
  )
);
```

**Policy 2: INSERT**
```sql
CREATE POLICY "Users can add tracking updates"
ON tracking_history FOR INSERT
WITH CHECK (auth.uid() = (SELECT created_by FROM packages WHERE id = package_id));
```

### Step 4: Get Your Credentials

1. Go to **Settings** → **API** in the left sidebar
2. You'll see:
   - **Project URL** (copy this as `supabaseUrl`)
   - **anon public** key (copy this as `supabaseAnonKey`)
3. Save these for the next section

### Step 5: Enable Email Auth (Optional Enhancement)

1. Go to **Authentication** → **Providers**
2. Enable **Email** if not already enabled
3. (Optional) Configure SMTP for custom emails instead of default Supabase templates

---

## EmailJS Configuration

EmailJS sends automated emails to shipment recipients.

### Step 1: Create EmailJS Account

1. Visit [emailjs.com](https://www.emailjs.com/)
2. Sign up with email
3. Verify your email address

### Step 2: Set Up Email Service

1. In EmailJS dashboard, go to **Email Services**
2. Click **"Add Service"**
3. Select **Gmail** or your email provider:
   - **For Gmail**: You'll need an [App Password](https://support.google.com/accounts/answer/185833)
   - **For other providers**: Follow EmailJS prompts
4. Name your service: `shippingmaxgh_notifications`
5. Click **"Add Service"**

### Step 3: Create Email Template

1. Go to **Email Templates**
2. Click **"Create New Template"**
3. Configure:
   - **Template Name**: `shipment_notification`
   - **Subject**: 
   ```
   @{message} - Tracking #@{tracking_number}
   ```
   - **HTML Content**: Copy from the template below
4. Click **"Save"**

#### Email Template HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
        }
        .header {
            background: linear-gradient(135deg, #0D9488 0%, #115E59 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            border-left: 4px solid #F97316;
        }
        .info-box {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: bold;
            color: #0D9488;
        }
        .tracking-link {
            background: #0D9488;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>@{company_name}</h1>
            <p>Secure Gold Logistics</p>
        </div>

        <div class="content">
            <p>Hello @{to_name},</p>

            <p>@{message}</p>

            <div class="info-box">
                <div class="info-row">
                    <span class="label">Tracking #</span>
                    <span>@{tracking_number}</span>
                </div>
                <div class="info-row">
                    <span class="label">Current Status</span>
                    <span>@{status}</span>
                </div>
                <div class="info-row">
                    <span class="label">Location</span>
                    <span>@{location}</span>
                </div>
                <div class="info-row">
                    <span class="label">Date</span>
                    <span>@{current_date}</span>
                </div>
                @{notes}
            </div>

            <center>
                <a href="@{public_tracking_link}" class="tracking-link">
                    Track Your Shipment
                </a>
            </center>

            <p style="color: #6b7280; font-size: 14px;">
                Use the link above to view detailed tracking information and full shipment history.
            </p>
        </div>

        <div class="footer">
            <p>&copy; @{current_date} @{company_name}. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
```

### Step 4: Get EmailJS Credentials

1. Go to **Integration** section in EmailJS
2. Copy:
   - **Service ID**: (e.g., `service_08tqtul`)
   - **Template ID**: (e.g., `template_cyvowue`)
   - **Public Key**: (from Account → API Keys)
3. Save these for the next section

---

## Local Development Setup

### Running Locally

#### Option 1: Python (Recommended)

```bash
# Python 3.x
cd aurex-gold
python -m http.server 8000

# Then open: http://localhost:8000
```

#### Option 2: Node.js

```bash
# Install http-server globally
npm install -g http-server

# Serve the app
http-server aurex-gold -p 8000

# Then open: http://localhost:8000
```

#### Option 3: Live Server (VS Code)

1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. Browser opens automatically

### Testing the Application

1. Go to **Sign In** page
2. Click **"Create an account"** link
3. Sign up with test email and password
4. You'll be redirected to dashboard
5. Click **"Log New Shipment"**
6. Fill in test data:
   - **Consignee**: Test Company Ltd
   - **Email**: your-test-email@gmail.com
   - **Status**: Pending
   - **Location**: Test Warehouse
7. Submit and check your email for notification

---

## Configuration File

Update `config.js` with your credentials:

```javascript
const CONFIG = {
  // ============ COMPANY INFO ============
  companyName: 'Shippingmaxgh Gold',
  companyTagline: 'Secure Gold Logistics',
  companyLogoUrl: '/shippingmaxgh logo.PNG',
  companyWebsite: 'https://shippingmaxgh.com',

  // ============ SUPABASE CONFIGURATION ============
  supabaseUrl: 'YOUR_SUPABASE_URL_HERE',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY_HERE',

  // ============ EMAILJS CONFIGURATION ============
  emailJsServiceId: 'YOUR_SERVICE_ID_HERE',
  emailJsTemplateId: 'YOUR_TEMPLATE_ID_HERE',
  emailJsPublicKey: 'YOUR_PUBLIC_KEY_HERE',

  // ... rest of configuration
};
```

### Configuration Properties Explained

| Property | Description | Example |
|----------|-------------|---------|
| `companyName` | Display name | `Shippingmaxgh Gold` |
| `supabaseUrl` | Supabase project URL | `https://ndiypxttcwoext...supabase.co` |
| `supabaseAnonKey` | Public API key | `sb_publishable_qfvklxBx...` |
| `emailJsServiceId` | EmailJS service | `service_08tqtul` |
| `emailJsTemplateId` | EmailJS template | `template_cyvowue` |
| `emailJsPublicKey` | EmailJS public key | `6zumjBieykqppdFT5` |
| `shipmentTypes` | Available types | Gold Bullion, Coins, etc. |

---

## Environment Variables (For Production)

For security, use environment variables instead of hardcoding credentials:

### Create `.env.local` file:

```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

Then reference in `config.js`:

```javascript
const CONFIG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  // ...
};
```

---

## Troubleshooting

### Supabase Connection Issues

**Problem**: "Error connecting to database"

**Solutions**:
1. Verify `supabaseUrl` and `supabaseAnonKey` are correct in `config.js`
2. Check Supabase project is active (not paused)
3. Verify tables exist: Go to **Table Editor** in Supabase dashboard
4. Check RLS policies aren't blocking access
5. Open browser console (F12) for detailed error messages

### EmailJS Not Sending

**Problem**: "Email notification failed"

**Solutions**:
1. Verify EmailJS service is active (go to Email Services)
2. Check template exists with correct ID
3. Verify sender email is authorized in your email service
4. Check daily email quota hasn't been exceeded
5. Test directly in EmailJS dashboard → **Templates** → **Test**

### Authentication Problems

**Problem**: "Cannot sign in" or "Session expired"

**Solutions**:
1. Verify Supabase Auth is enabled
2. Check user was created in Supabase → **Authentication** → **Users**
3. Clear browser cache and try again
4. Verify email is correctly formatted

### CORS Errors

**Problem**: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solutions**:
1. Ensure you're running on a proper server (not file:// protocol)
2. Check Supabase CORS settings → **Settings** → **API** → **CORS**
3. Add your domain to CORS allowed list

### Styling Issues

**Problem**: "Page looks broken" or "CSS not loading"

**Solutions**:
1. Hard refresh browser (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)
2. Check `style.css` file exists in project root
3. Verify all font imports in `style.css` load correctly
4. Check for JavaScript errors in console (F12)

---

## Security Checklist

- [ ] Never commit `config.js` with real credentials to public repositories
- [ ] Use `.env` files for sensitive data in production
- [ ] Enable HTTPS on production domain
- [ ] Regularly rotate API keys
- [ ] Monitor Supabase usage and quotas
- [ ] Enable 2FA on Supabase and EmailJS accounts
- [ ] Regularly backup Supabase database
- [ ] Test RLS policies thoroughly before production
- [ ] Set up monitoring/alerts for failed emails

---

## Next Steps

- See [DEPLOYMENT.md](DEPLOYMENT.md) for going live
- Configure backup strategy for database
- Set up monitoring and error tracking
- Create user documentation for team

