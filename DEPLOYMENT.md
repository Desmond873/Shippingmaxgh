# Deployment Guide — Shippingmaxgh Gold

Instructions for deploying the shipment tracker to production.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Platforms](#deployment-platforms)
4. [Post-Deployment](#post-deployment)
5. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

Before deploying to production, complete all items:

- [ ] All environment variables configured securely
- [ ] Supabase RLS policies tested and verified
- [ ] Email notifications tested with real recipient
- [ ] Database backups scheduled
- [ ] User testing completed
- [ ] Security audit performed
- [ ] HTTPS enabled on domain
- [ ] 404 and error pages configured
- [ ] Analytics setup (optional)
- [ ] Uptime monitoring configured

---

## Environment Configuration

### Production vs Development

**Development** (`config.js`):
- Can contain placeholder values
- Uses free tier services
- Relaxed security settings

**Production** (`config.js` or `.env`):
- Must use secure credentials
- Use production-tier services if needed
- Strict security policies

### Securing Credentials

#### Option 1: Environment Variables (Recommended)

Store credentials in platform-specific environment variables:

**Netlify**:
1. Dashboard → Site settings → Build & deploy → Environment
2. Add variables:
   ```
   REACT_APP_SUPABASE_URL=your_url
   REACT_APP_SUPABASE_ANON_KEY=your_key
   REACT_APP_EMAILJS_SERVICE_ID=your_id
   REACT_APP_EMAILJS_TEMPLATE_ID=your_id
   REACT_APP_EMAILJS_PUBLIC_KEY=your_key
   ```

**Vercel**:
1. Project Settings → Environment Variables
2. Add same variables as above
3. Redeploy after adding

**Traditional Hosting**:
1. Set environment variables on server
2. Or use `.env` file (not in git)
3. Reference in `config.js`:
   ```javascript
   const CONFIG = {
     supabaseUrl: process.env.SUPABASE_URL,
     // ...
   };
   ```

#### Option 2: Config File

Create separate `config.production.js`:

```javascript
const CONFIG = {
  supabaseUrl: 'your-production-url',
  supabaseAnonKey: 'your-production-key',
  // ...
};
```

Load conditionally:
```html
<script>
  const env = window.location.hostname === 'localhost' ? 'dev' : 'prod';
  const configFile = env === 'prod' ? 'config.production.js' : 'config.js';
</script>
<script src="${configFile}"></script>
```

---

## Deployment Platforms

### Option 1: Netlify (Recommended)

**Advantages**:
- Free tier with generous limits
- Easy continuous deployment from Git
- Built-in HTTPS
- Good performance

**Setup**:

1. Create GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/aurex-gold.git
   git push -u origin main
   ```

2. Sign up at [netlify.com](https://www.netlify.com)

3. Click **"New site from Git"**

4. Connect GitHub account and authorize

5. Select your `aurex-gold` repository

6. Configure build:
   - **Base directory**: `/` (root)
   - **Build command**: (leave empty - static site)
   - **Publish directory**: `/` (root, where index.html is)

7. Click **"Deploy site"**

8. Set environment variables:
   - Go to **Site settings** → **Build & deploy** → **Environment**
   - Add your Supabase and EmailJS credentials

9. Configure domain:
   - Go to **Domain management**
   - Add custom domain or use Netlify subdomain
   - Set up SSL (automatic with Netlify)

10. Configure redirects (optional):
    - Create `_redirects` file in root:
      ```
      /* /index.html 200
      ```
    - This handles client-side routing

**Deployment after changes**:
```bash
git add .
git commit -m "Your message"
git push origin main
```
(Automatic deployment triggers)

---

### Option 2: Vercel

**Advantages**:
- Zero-config deployments
- Excellent performance with edge network
- Great for Next.js (if upgrading in future)
- Free tier generous

**Setup**:

1. Sign up at [vercel.com](https://vercel.com)

2. Click **"Import Project"**

3. Connect GitHub and select `aurex-gold` repository

4. Configure:
   - **Framework**: Select **Other** (static site)
   - **Root Directory**: `/`

5. Add environment variables:
   - Add Supabase and EmailJS credentials

6. Click **"Deploy"**

7. Visit your deployed site (vercel gives you a unique URL)

8. Connect custom domain:
   - **Project Settings** → **Domains**
   - Add your domain and follow DNS setup

**Auto-deployment**: Push to main branch = automatic deployment

---

### Option 3: GitHub Pages (Free, Limited)

**Advantages**:
- Completely free
- Simple setup for static sites

**Disadvantages**:
- No backend functions (only static files)
- Limited privacy (source code visible)

**Setup**:

1. Create GitHub repository named `yourname.github.io`

2. Push your code:
   ```bash
   git clone https://github.com/yourname/yourname.github.io.git
   cd yourname.github.io
   cp -r aurex-gold/* .
   git add .
   git commit -m "Add aurex-gold"
   git push
   ```

3. Site is live at: `https://yourname.github.io`

**Note**: GitHub Pages doesn't support environment variables easily. You'll need to hardcode credentials or use a build step.

---

### Option 4: Traditional Hosting (cPanel, etc.)

**Setup**:

1. Get FTP/SFTP credentials from hosting provider

2. Connect via FTP client (FileZilla, etc.):
   ```
   Host: your-domain.com
   Username: your-username
   Password: your-password
   Port: 21 (or 22 for SFTP)
   ```

3. Upload all files to `public_html` folder

4. Update `config.js` with production credentials

5. Verify HTTPS is enabled (usually automatic now)

6. Test at your domain

**For auto-deployment**, set up Git integration:
```bash
# On server
cd /home/user/public_html
git clone https://github.com/yourname/aurex-gold.git .
```

Then pull changes:
```bash
git pull origin main
```

---

### Option 5: Docker Container

**Dockerfile**:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy application files
COPY . .

# Install simple HTTP server
RUN npm install -g serve

# Build (if needed)
# RUN npm run build

EXPOSE 3000

CMD ["serve", "-s", ".", "-l", "3000"]
```

**Build and run**:

```bash
# Build image
docker build -t aurex-gold:latest .

# Run container
docker run -p 3000:80 aurex-gold:latest
```

**Deploy to cloud**:

- **AWS ECS**: Push image to ECR, deploy to ECS
- **Google Cloud**: Push to Container Registry, deploy to Cloud Run
- **Azure**: Push to Container Registry, deploy to Container Instances

---

## Post-Deployment

### 1. Domain Configuration

Update these in `config.js` for your production domain:

```javascript
const CONFIG = {
  companyWebsite: 'https://yourdomain.com',
  tracking: {
    publicTrackingUrl: 'https://yourdomain.com/detail.html',
    // ...
  },
};
```

### 2. Email Template Update

In EmailJS, update email template public link:

```html
<!-- Before -->
<a href="http://localhost:3000/detail.html?tracking=@{tracking_number}">

<!-- After -->
<a href="https://yourdomain.com/detail.html?tracking=@{tracking_number}">
```

### 3. SSL/HTTPS Certificate

**If using traditional hosting**:
1. Use Let's Encrypt (free, automated)
2. Or purchase from certificate authority

**Most platforms** (Netlify, Vercel, GitHub Pages) include free HTTPS.

### 4. Test Production

1. Create test shipment on production site
2. Verify email arrives to recipient
3. Click tracking link and verify it works
4. Test status update and notification
5. Verify all pages load correctly

### 5. Set Up Monitoring

#### Uptime Monitoring

Use free services like:
- **Pingdom** (pingdom.com)
- **UptimeRobot** (uptimerobot.com)
- **Freshping** (freshping.com)

Setup:
1. Add monitoring for your domain
2. Set alert email when site goes down
3. Get notified of issues immediately

#### Error Tracking

Integrate error tracking (optional):

```html
<!-- Sentry for error tracking -->
<script src="https://cdn.ravenjs.com/3.26.4/raven.min.js"></script>
<script>
  Raven.config('YOUR_SENTRY_DSN').install();
</script>
```

#### Analytics (Optional)

Add Google Analytics:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## Monitoring & Maintenance

### Daily Checks

- [ ] Website is accessible
- [ ] Emails are being sent
- [ ] No error logs appearing
- [ ] Database has available storage

### Weekly Tasks

- [ ] Review server logs
- [ ] Check error tracking dashboard
- [ ] Verify backups completed
- [ ] Monitor email usage quotas

### Monthly Tasks

- [ ] Full system test (create shipment, update status, verify email)
- [ ] Review and optimize database
- [ ] Check Supabase usage against quotas
- [ ] Update dependencies if needed
- [ ] Review security logs

### Quarterly Tasks

- [ ] Database performance audit
- [ ] Load testing if expecting increased traffic
- [ ] Security vulnerability scan
- [ ] Disaster recovery drill (test restores from backup)

### Database Backups

**Supabase automatic backups**:
- Enabled by default on paid plans
- Daily backups for free tier (limited retention)

**Manual backup**:

1. Go to Supabase Dashboard
2. Click **"Backups"** in left menu
3. Click **"Create backup"**
4. Download backup file
5. Store securely (encrypted)

### Scaling Considerations

**If experiencing issues**:

| Issue | Solution |
|-------|----------|
| Slow page loads | Use CDN (Cloudflare free tier) |
| Database slow | Upgrade Supabase plan / optimize queries |
| Email quota exceeded | Upgrade EmailJS plan |
| High traffic | Upgrade hosting tier |

---

## Rollback Procedure

If deployment has issues:

**Netlify**:
1. Go to **Deploys** tab
2. Find previous successful deployment
3. Click **"Publish deploy"**

**Vercel**:
1. Go to **Deployments**
2. Find previous stable version
3. Click **"Promote to production"**

**Git-based**:
```bash
git revert <commit-hash>
git push origin main
```

---

## Troubleshooting

### Site Shows "Not Found" on Custom Domain

1. Verify DNS records point to hosting platform
2. Wait up to 24 hours for DNS to propagate
3. Use [DNS Checker](https://dnschecker.org) to verify

### Emails Not Sending on Production

1. Verify EmailJS service is still active
2. Check daily email quota hasn't been exceeded
3. Verify sender email is authorized
4. Check email template still exists with same ID

### Database Connection Errors

1. Verify credentials match production values
2. Check Supabase project is running (not paused)
3. Verify IP whitelist (if applicable)
4. Check RLS policies aren't too restrictive

### HTTPS Not Working

1. Force HTTPS redirect (in hosting settings)
2. Update config.js to use `https://` URLs
3. Update email templates with `https://` links

---

## Emergency Contacts

Keep these handy for production issues:

- **Supabase Support**: support@supabase.io
- **EmailJS Support**: support@emailjs.com
- **Your Hosting Support**: (varies by platform)

---

## Checklist for Going Live

- [ ] All credentials configured in production
- [ ] Supabase database tables created with RLS
- [ ] EmailJS service and template set up
- [ ] Domain registered and pointing correctly
- [ ] HTTPS working
- [ ] Test email sending works
- [ ] Test shipment creation works
- [ ] Backups configured
- [ ] Monitoring/alerts set up
- [ ] Documentation shared with team
- [ ] Team trained on using the system
- [ ] Error handling tested
- [ ] Edge cases tested (missing email, etc.)

Once all items checked, you're ready to go live! 🚀

