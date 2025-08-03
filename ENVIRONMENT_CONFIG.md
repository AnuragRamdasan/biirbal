# Environment Configuration Guide

This document outlines all the environment variables needed for the complete SEO and analytics setup for Biirbal.com.

## 🔧 Required Environment Variables

### **Core Application Configuration**
```bash
# Application Base URL (with www subdomain)
NEXTAUTH_URL=https://www.biirbal.com
NEXT_PUBLIC_BASE_URL=https://www.biirbal.com

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your_nextauth_secret_key

# Node Environment
NODE_ENV=production
```

### **Database Configuration**
```bash
# PostgreSQL Database
DATABASE_URL="postgresql://username:password@host:port/database_name"
DATABASE_UNPOOLED_URL="postgresql://username:password@host:port/database_name"
```

### **Authentication**
```bash
# Google OAuth (for NextAuth)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# Email Service (Brevo)
BREVO_API_KEY=your_brevo_api_key
FROM_EMAIL=noreply@biirbal.com
FROM_NAME="Biirbal Team"
```

### **Slack Integration**
```bash
# Slack OAuth Configuration
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret
```

### **Payment Processing (Stripe)**
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs
STRIPE_STARTER_MONTHLY_PRICE_ID=price_starter_monthly_id
STRIPE_STARTER_ANNUAL_PRICE_ID=price_starter_annual_id
STRIPE_PRO_MONTHLY_PRICE_ID=price_pro_monthly_id
STRIPE_PRO_ANNUAL_PRICE_ID=price_pro_annual_id
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_business_monthly_id
STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_business_annual_id
```

### **Redis Queue System**
```bash
# Redis for Background Jobs
REDIS_URL="redis://username:password@host:port"
```

### **AI Services**
```bash
# Google Cloud for Text-to-Speech
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

---

## 📈 Analytics & SEO Configuration

### **Google Analytics 4**
```bash
# GA4 Configuration
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=your_ga4_api_secret
```

### **Hotjar Analytics**
```bash
# Hotjar Configuration
NEXT_PUBLIC_HOTJAR_ID=1234567
```

### **ZapDigits Analytics** ✅ Already Added
```bash
# ZapDigits is hardcoded in layout.tsx with site-id="9"
# No environment variable needed - already implemented
```

### **Search Engine Verification**
```bash
# Google Search Console
GOOGLE_VERIFICATION=your_google_verification_code

# Bing Webmaster Tools
BING_VERIFICATION=your_bing_verification_code

# Yandex Verification
YANDEX_VERIFICATION=your_yandex_verification_code
```

---

## 🎯 SEO-Specific Variables

### **Domain Configuration**
```bash
# Primary Domain (automatically handled by getBaseUrl())
CANONICAL_DOMAIN=www.biirbal.com

# CDN Configuration (if using)
NEXT_PUBLIC_CDN_URL=https://cdn.biirbal.com
```

### **Social Media Integration**
```bash
# Twitter API (for enhanced social sharing)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret

# LinkedIn (for company page integration)
LINKEDIN_CLIENT_ID=your_linkedin_client_id
```

---

## 🚀 Production Deployment Variables

### **Vercel/Heroku Specific**
```bash
# Vercel Configuration
VERCEL_URL=automatically_set_by_vercel
VERCEL_GIT_COMMIT_SHA=automatically_set_by_vercel

# Heroku Configuration  
HEROKU_APP_NAME=your_heroku_app_name
HEROKU_SLUG_COMMIT=automatically_set_by_heroku
```

### **Performance Monitoring**
```bash
# New Relic (optional)
NEW_RELIC_LICENSE_KEY=your_new_relic_key
NEW_RELIC_APP_NAME=biirbal-production

# Sentry Error Tracking (optional)
SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_SENTRY_DSN=your_public_sentry_dsn
```

---

## 🔒 Security Configuration

### **Authentication & Security**
```bash
# NextAuth Secret
NEXTAUTH_SECRET=your_super_secret_key_here

# CSRF Protection
CSRF_SECRET=your_csrf_secret

# API Rate Limiting
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=3600000
```

### **Content Security Policy**
```bash
# CSP Configuration
CSP_REPORT_URI=https://biirbal.report-uri.com/r/d/csp/enforce
```

---

## 📧 Email Configuration

### **Transactional Email**
```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@biirbal.com

# Or Mailgun Alternative
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=mg.biirbal.com
```

---

## 🌍 Geographic & Internationalization

### **Geographic Targeting**
```bash
# Primary Market
PRIMARY_COUNTRY=US
PRIMARY_REGION=US-CA
PRIMARY_CITY="San Francisco"

# Supported Languages
SUPPORTED_LOCALES=en,en-US
DEFAULT_LOCALE=en-US
```

---

## 🔍 Development & Testing

### **Development Only**
```bash
# Development Database
DEV_DATABASE_URL="postgresql://localhost:5432/biirbal_dev"

# Local Testing
SKIP_ENV_VALIDATION=false
MOCK_SLACK_RESPONSES=false
MOCK_STRIPE_RESPONSES=false
```

---

## ✅ Priority Configuration Checklist

### **Must Have (Critical)**
- [x] NEXTAUTH_URL=https://www.biirbal.com
- [x] DATABASE_URL (PostgreSQL)
- [ ] SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET
- [ ] STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- [ ] REDIS_URL

### **Analytics & SEO (High Priority)**
- [ ] NEXT_PUBLIC_GA_MEASUREMENT_ID
- [ ] NEXT_PUBLIC_HOTJAR_ID
- [x] ZapDigits Analytics (already implemented)
- [ ] GOOGLE_VERIFICATION
- [ ] BING_VERIFICATION

### **Nice to Have (Medium Priority)**
- [ ] SENDGRID_API_KEY
- [ ] SENTRY_DSN
- [ ] NEW_RELIC_LICENSE_KEY

---

## 🔧 How to Set Environment Variables

### **Vercel Deployment**
```bash
# Using Vercel CLI
vercel env add NEXTAUTH_URL
vercel env add DATABASE_URL
vercel env add SLACK_CLIENT_ID
# ... continue for all variables
```

### **Heroku Deployment**
```bash
# Using Heroku CLI
heroku config:set NEXTAUTH_URL=https://www.biirbal.com
heroku config:set DATABASE_URL=postgresql://...
heroku config:set SLACK_CLIENT_ID=your_client_id
# ... continue for all variables
```

### **Local Development**
Create a `.env.local` file in your project root:
```bash
# Copy .env.example to .env.local
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local
```

---

## 🎯 SEO Impact Summary

With all these configurations properly set:

- **Google Analytics 4**: Complete conversion tracking
- **Search Console**: Site verification and indexing
- **Core Web Vitals**: Performance monitoring
- **Social Sharing**: Optimized for all platforms
- **International SEO**: Multi-region support ready
- **Structured Data**: Rich snippets enabled
- **Security**: Enhanced trust signals

**Expected Results:**
- 90+ PageSpeed Score
- 95+ SEO Score  
- Enhanced search visibility
- Complete analytics coverage
- Professional social sharing