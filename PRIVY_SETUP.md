# Privy Google Login Setup Guide

## Why Google Login Isn't Working

Google login via Privy requires:
1. **Privy App ID** configured in environment variables
2. **Google OAuth enabled** in Privy dashboard
3. **HTTPS** (required for OAuth)

## Setup Steps

### 1. Get Privy App ID

1. Go to https://dashboard.privy.io
2. Sign up or log in
3. Create a new app
4. Copy your **App ID** (looks like `clxxxxxxxxxxxxx`)

### 2. Enable Google OAuth in Privy Dashboard

1. In your Privy dashboard, go to **Settings** → **OAuth**
2. Enable **Google** as a login provider
3. Configure OAuth redirect URLs:
   - For local dev: `http://localhost:3000` and `https://localhost:3000`
   - For production: Your production domain

### 3. Set Environment Variable

Add to `frontend/.env.local`:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxx
```

### 4. Restart Development Server

After setting the environment variable:

```bash
cd frontend
npm run dev
```

## Troubleshooting

### "Auth disabled" message
- **Cause**: `NEXT_PUBLIC_PRIVY_APP_ID` is not set
- **Fix**: Add the App ID to `.env.local` and restart

### Google login not showing in modal
- **Cause**: Google OAuth not enabled in Privy dashboard
- **Fix**: Enable Google in Privy dashboard → Settings → OAuth

### OAuth redirect error
- **Cause**: Redirect URL not configured in Privy dashboard
- **Fix**: Add your domain to OAuth redirect URLs in Privy dashboard

### HTTPS requirement
- **Cause**: OAuth requires HTTPS
- **Fix**: The app automatically redirects HTTP to HTTPS, or use `https://localhost:3000` directly

## Testing

1. Click "Connect" button
2. Privy modal should show with Google option
3. Click "Continue with Google"
4. Complete Google OAuth flow
5. Wallet will be automatically created

## Current Status

- ✅ Privy integration code is ready
- ✅ Google login configured in code
- ⚠️ Requires Privy App ID from dashboard
- ⚠️ Requires Google OAuth enabled in dashboard

## Alternative: Use Wallet Login

If Google login isn't set up yet, you can still use:
- **Wallet Connect** - Connect existing wallets
- **Email** - Email-based login (creates embedded wallet)



