# Railway Build Plan Error - Fix Guide

## Error: "Error creating build plan with Railpack"

This happens when Railway can't detect your Node.js project.

## ✅ Solution 1: Set Root Directory (Easiest)

1. In Railway project → **Settings** → **Deployment**
2. Set **Root Directory**: `backend`
3. Railway will auto-detect:
   - `backend/package.json` ✅
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

## ✅ Solution 2: Use Environment Variables (If Solution 1 doesn't work)

If Railway still can't detect, add these in **Variables** tab:

```bash
NIXPACK_BUILD_CMD=cd backend && npm install && npm run build
NIXPACK_START_CMD=cd backend && npm start
```

## ✅ Solution 3: Verify package.json Scripts

Make sure `backend/package.json` has:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

## ✅ Solution 4: Check File Structure

Railway needs to see:
```
backend/
  ├── package.json  ← Must exist here
  ├── tsconfig.json
  ├── src/
  │   └── index.ts
  └── dist/  ← Created after build
```

## Quick Checklist

- [ ] Root Directory set to `backend` in Railway Settings → Deployment
- [ ] `backend/package.json` exists
- [ ] `backend/package.json` has `build` and `start` scripts
- [ ] `backend/tsconfig.json` exists (for TypeScript)
- [ ] If still failing, add `NIXPACK_BUILD_CMD` and `NIXPACK_START_CMD` env vars

## Common Mistakes

❌ **Wrong**: Root Directory = `.` (root of repo)
✅ **Correct**: Root Directory = `backend`

❌ **Wrong**: Root Directory = `frontend`
✅ **Correct**: Root Directory = `backend`

❌ **Wrong**: No `build` script in package.json
✅ **Correct**: `"build": "tsc"` in package.json

## Still Not Working?

1. Check Railway build logs for specific error
2. Verify `backend/package.json` is valid JSON
3. Try deploying from Railway CLI:
   ```bash
   npm i -g @railway/cli
   railway login
   railway link
   railway up
   ```

