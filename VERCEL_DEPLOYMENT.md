# Vercel Deployment Guide

## Required Environment Variables

Set these in your Vercel project settings (Settings → Environment Variables):

### Frontend Environment Variables

#### Required:
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```
- **Description**: Backend API URL (your Express backend)
- **Production**: Your deployed backend URL (e.g., `https://api.prophezy.com`)
- **Development**: `http://localhost:3001` (for local testing)

#### Optional (for Privy Account Abstraction):
```bash
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
```
- **Description**: Privy App ID for account abstraction features
- **Get it from**: [Privy Dashboard](https://dashboard.privy.io/)
- **Note**: If not set, the app will work but without AA features

### Backend Environment Variables (if deploying backend separately)

**IMPORTANT**: These are for your backend deployment (Railway, Render, etc.), NOT for Vercel!

If you're deploying the backend separately (not on Vercel), set these in your backend hosting platform:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
BNB_CHAIN_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
PRIVATE_KEY=your_private_key_here
REDSTONE_API_KEY=your_redstone_api_key_here
ORACLE_SERVICE_URL=http://localhost:8000
PORT=3001
```

Then, in Vercel, set `NEXT_PUBLIC_API_URL` to your deployed backend URL (e.g., `https://prophezy-backend.railway.app`)

## Vercel Deployment Steps

### 1. Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository: `seedify-prediction-hackathon`

### 2. Configure Project Settings
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `frontend` (important!)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 3. Set Environment Variables
In Vercel project settings → Environment Variables, add:

**For Production:**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```
- Replace `https://your-backend-url.com` with your actual deployed backend URL
- Examples: `https://prophezy-backend.railway.app` or `https://api.prophezy.com`
- This is the URL where your Express backend is hosted (NOT the database URL!)

**Optional (for Privy):**
```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

**For Preview/Development:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

### 4. Deploy
1. Click "Deploy"
2. Vercel will automatically:
   - Install dependencies
   - Build the Next.js app
   - Deploy to production

### 5. Update Backend CORS (if needed)
If your backend is on a different domain, update CORS settings:

```typescript
// backend/src/index.ts
app.use(cors({
  origin: [
    'https://your-vercel-app.vercel.app',
    'https://your-custom-domain.com',
    'http://localhost:3000' // for local dev
  ],
  credentials: true,
}));
```

## Important Notes

### Root Directory Configuration
Since your frontend is in the `frontend/` folder, you MUST set:
- **Root Directory**: `frontend` in Vercel project settings

### Environment Variable Prefix
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Variables without `NEXT_PUBLIC_` are server-side only
- Never expose secrets with `NEXT_PUBLIC_` prefix

### Backend Deployment
The backend (Express API) should be deployed separately:
- **Options**: Railway, Render, Heroku, AWS, DigitalOcean
- **Required**: Set `NEXT_PUBLIC_API_URL` in Vercel to point to your backend

### SSL Certificates
- Vercel handles SSL automatically
- No need to configure certificates
- Remove `server.js` from production (Vercel uses its own server)

## Post-Deployment Checklist

- [ ] Verify `NEXT_PUBLIC_API_URL` points to your backend
- [ ] Test wallet connection (Privy)
- [ ] Test market creation
- [ ] Test betting functionality
- [ ] Verify API calls work from production domain
- [ ] Update backend CORS to include Vercel domain
- [ ] Test on mobile devices (PWA)

## Troubleshooting

### Build Fails
- Check Root Directory is set to `frontend`
- Verify all dependencies are in `frontend/package.json`
- Check build logs in Vercel dashboard

### API Calls Fail
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend CORS settings
- Verify backend is deployed and accessible

### Privy Not Working
- Verify `NEXT_PUBLIC_PRIVY_APP_ID` is set
- Check Privy dashboard for app configuration
- Ensure HTTPS is enabled (Vercel does this automatically)

