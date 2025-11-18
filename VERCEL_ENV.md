# Vercel Environment Variables

## ⚠️ IMPORTANT: What Goes Where

### For Vercel (Frontend) - Set These:
```
NEXT_PUBLIC_API_URL=https://your-backend-api-url.com
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id (optional)
```

### For Backend Hosting (Railway/Render/etc.) - Set These Separately:
```
DATABASE_URL=postgresql://user:password@host:5432/database
BNB_CHAIN_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
PRIVATE_KEY=your_private_key_here
REDSTONE_API_KEY=your_redstone_api_key_here
ORACLE_SERVICE_URL=http://localhost:8000
PORT=3001
```

## Vercel Environment Variables (Frontend Only)

Set these in **Vercel Dashboard → Your Project → Settings → Environment Variables**:

### 1. `NEXT_PUBLIC_API_URL` (Required)
```
NEXT_PUBLIC_API_URL=https://your-backend-api-url.com
```
- **What it is**: The URL where your Express backend is deployed
- **NOT**: Database URL or RPC URL (those go in backend hosting)
- **Examples**:
  - Railway: `https://prophezy-backend.railway.app`
  - Render: `https://prophezy-backend.onrender.com`
  - Custom: `https://api.prophezy.com`
- **What it does**: Frontend uses this to call your backend API

### 2. `NEXT_PUBLIC_PRIVY_APP_ID` (Optional)
```
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxx
```
- **What it does**: Enables Privy account abstraction (gasless transactions, social login)
- **Get it from**: [Privy Dashboard](https://dashboard.privy.io/)
- **Note**: App works without this, but without AA features

## Quick Setup Steps

1. **Deploy Backend First** (Railway, Render, etc.)
   - Deploy your Express backend
   - Get the backend URL (e.g., `https://prophezy-backend.railway.app`)
   - Set backend env vars in your backend hosting platform

2. **Deploy Frontend on Vercel**
   - Go to https://vercel.com/dashboard
   - Click "Add New Project"
   - Import: `seedify-prediction-hackathon`
   - **Root Directory**: `frontend` ⚠️ IMPORTANT!

3. **Add Environment Variables in Vercel**
   - Go to Settings → Environment Variables
   - Add `NEXT_PUBLIC_API_URL` = your backend URL from step 1
   - Add `NEXT_PUBLIC_PRIVY_APP_ID` = your Privy app ID (optional)

4. **Deploy**
   - Click "Deploy"
   - Done! 🎉

## Example Setup

### Backend (Railway/Render)
```
Backend URL: https://prophezy-backend.railway.app
Backend has: DATABASE_URL, BNB_CHAIN_RPC_URL, PRIVATE_KEY, etc.
```

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://prophezy-backend.railway.app
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxx
```

## Notes

- `NEXT_PUBLIC_API_URL` = Your backend API endpoint URL
- `DATABASE_URL` = Goes in backend hosting, NOT Vercel
- `BNB_CHAIN_RPC_URL` = Goes in backend hosting, NOT Vercel
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Never put secrets (private keys, passwords) in `NEXT_PUBLIC_` variables
