# Backend Deployment Guide - Railway (Free!)

## ✅ Railway Free Tier
- **$5 credit/month** - Perfect for hackathons!
- **No credit card required** for free tier
- **Auto-deploys** from GitHub

## Quick Start (5 Minutes)

### Step 1: Sign Up
1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (free)

### Step 2: Deploy Backend
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose: `seedify-prediction-hackathon`
4. Railway will detect it's a Node.js project

### Step 3: Configure Project
**CRITICAL**: Railway needs to know where your backend is!

1. In Railway project → **Settings** → **Deployment**
2. Set **Root Directory**: `backend` ⚠️ IMPORTANT!
3. Railway will auto-detect Node.js and use:
   - **Build Command**: `npm install && npm run build` (auto-detected)
   - **Start Command**: `npm start` (auto-detected from package.json)

**If Railway still can't detect:**
- Go to **Variables** tab
- Add: `NIXPACK_BUILD_CMD=cd backend && npm install && npm run build`
- Add: `NIXPACK_START_CMD=cd backend && npm start`

### Step 4: Add PostgreSQL Database
1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway automatically creates `DATABASE_URL` environment variable
4. ✅ Done! Database is ready

### Step 5: Set Environment Variables
In Railway project → **Variables** tab, add:

```bash
# Database (auto-added by PostgreSQL service)
DATABASE_URL=postgresql://... (Railway provides this automatically)

# Blockchain
BNB_CHAIN_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# Server
PORT=3001
```

**Optional** (only if you need them):
```bash
PRIVATE_KEY=your_private_key_here
REDSTONE_API_KEY=your_redstone_api_key
ORACLE_SERVICE_URL=http://localhost:8000
```

### Step 6: Get Your Backend URL
1. Railway will generate a URL like: `https://prophezy-backend-production.up.railway.app`
2. Click on your service → **Settings** → **Generate Domain**
3. Copy the URL (e.g., `https://prophezy-backend.railway.app`)

### Step 7: Update CORS (Important!)
Your backend needs to allow requests from Vercel. Update `backend/src/index.ts`:

```typescript
app.use(cors({
  origin: [
    'https://your-vercel-app.vercel.app',  // Your Vercel domain
    'http://localhost:3000',                // Local dev
  ],
  credentials: true,
}));
```

Or allow all origins for hackathon (less secure but works):
```typescript
app.use(cors({
  origin: '*',  // Allows all origins
  credentials: true,
}));
```

### Step 8: Deploy!
1. Railway will automatically deploy when you push to GitHub
2. Or click "Deploy" button
3. Wait for build to complete (~2-3 minutes)
4. Check logs to see if it started successfully

### Step 9: Test Backend
Visit: `https://your-backend.railway.app/health`

Should return: `{"status":"ok","timestamp":"..."}`

### Step 10: Use in Vercel
Copy your Railway backend URL and set in Vercel:
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

## Environment Variables Summary

### Required in Railway:
- ✅ `DATABASE_URL` - Auto-added by PostgreSQL service
- ✅ `BNB_CHAIN_RPC_URL` - BNB Chain RPC (use testnet URL)
- ✅ `PORT` - Usually `3001` (Railway might override this)

### Optional:
- `PRIVATE_KEY` - Only if you need on-chain operations
- `REDSTONE_API_KEY` - Only if using Redstone oracle
- `ORACLE_SERVICE_URL` - Only if running oracle separately

## Troubleshooting

### Error: "Error creating build plan with Railpack"
This means Railway can't find your `package.json` or build commands.

**Fix:**
1. Go to Railway project → **Settings** → **Deployment**
2. Set **Root Directory**: `backend` (must match folder with package.json)
3. Verify `backend/package.json` has:
   ```json
   {
     "scripts": {
       "build": "tsc",
       "start": "node dist/index.js"
     }
   }
   ```
4. If still failing, add environment variables:
   - `NIXPACK_BUILD_CMD=cd backend && npm install && npm run build`
   - `NIXPACK_START_CMD=cd backend && npm start`

### Build Fails
- Check Root Directory is set to `backend`
- Verify `package.json` has `build` and `start` scripts
- Check Railway build logs
- Ensure TypeScript compiles: `npm run build` creates `dist/` folder

### Database Connection Fails
- Verify `DATABASE_URL` is set (Railway adds it automatically)
- Check PostgreSQL service is running (green status)
- Database tables are created automatically by your code

### Backend Won't Start
- Check `PORT` environment variable
- Railway might set `PORT` automatically - check logs
- Verify `npm start` runs `node dist/index.js`

### CORS Errors
- Update CORS in `backend/src/index.ts` to include Vercel domain
- Or temporarily allow all origins: `origin: '*'`

## Cost

**Railway Free Tier:**
- $5 credit/month
- Usually enough for hackathon projects
- No credit card required

**If you exceed free tier:**
- Hobby plan: $5/month
- Or use Render (also has free tier)

## Alternative: Render (Also Free)

1. Go to https://render.com
2. Sign up (free)
3. "New" → "Web Service"
4. Connect GitHub repo
5. Settings:
   - Root Directory: `backend`
   - Build: `npm install && npm run build`
   - Start: `npm start`
6. Add PostgreSQL database
7. Set environment variables
8. Deploy!

## Quick Checklist

- [ ] Railway account created
- [ ] Backend deployed from GitHub
- [ ] Root directory set to `backend`
- [ ] PostgreSQL database added
- [ ] Environment variables set
- [ ] Backend URL copied
- [ ] CORS updated to include Vercel domain
- [ ] Health check works (`/health` endpoint)
- [ ] Backend URL set in Vercel as `NEXT_PUBLIC_API_URL`

## Example Railway Setup

```
Project: prophezy-backend
Root Directory: backend
Build Command: npm install && npm run build
Start Command: npm start

Environment Variables:
  DATABASE_URL=postgresql://... (auto)
  BNB_CHAIN_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
  PORT=3001

Backend URL: https://prophezy-backend-production.up.railway.app
```

Use this URL in Vercel: `NEXT_PUBLIC_API_URL=https://prophezy-backend-production.up.railway.app`
