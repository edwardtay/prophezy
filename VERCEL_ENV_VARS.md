# Vercel Environment Variables

## Required Environment Variables for Frontend

Add these environment variables in your Vercel project settings:

### 1. Privy Authentication (Required for Auth)
```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
```

**How to get your Privy App ID:**
1. Go to https://privy.io
2. Sign up / Log in
3. Create a new app or select existing app
4. Copy the App ID from the dashboard
5. Add it to Vercel environment variables

**Note:** Without this variable, Privy authentication will be disabled and users won't be able to use social login or account abstraction features.

### 2. Backend API URL (Required for API calls)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

**Examples:**
- Production backend: `https://api.prophezy.com`
- Railway backend: `https://your-app.railway.app`
- Render backend: `https://your-app.onrender.com`
- Local development: `http://localhost:3001` (only for local)

**Note:** Make sure your backend CORS is configured to allow requests from your Vercel domain.

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: `NEXT_PUBLIC_PRIVY_APP_ID`
   - **Value**: Your Privy App ID
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**
5. Repeat for `NEXT_PUBLIC_API_URL`
6. **Redeploy** your application for changes to take effect

## Verification

After adding the environment variables and redeploying:

1. Check browser console - should NOT see: "Set NEXT_PUBLIC_PRIVY_APP_ID to enable Google login"
2. Privy login button should appear in the UI
3. Users should be able to authenticate with Google/Wallet/etc.

## Troubleshooting

**Privy still not working?**
- Make sure the variable name is exactly `NEXT_PUBLIC_PRIVY_APP_ID` (case-sensitive)
- Make sure you've redeployed after adding the variable
- Check Vercel build logs to verify the variable is being read
- Ensure your Vercel domain is HTTPS (Privy requires HTTPS)

**Backend API calls failing?**
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend CORS settings allow your Vercel domain
- Test the backend URL directly in browser


