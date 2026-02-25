# Quick Deployment Steps

## 🚀 Deploy in 5 Minutes

### Step 1: Push to GitHub (if not done)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 2: Deploy Backend (Railway)
1. Go to https://railway.app
2. Click "Start a New Project" → "Deploy from GitHub repo"
3. Select your repo
4. **Root Directory**: Leave empty or set to `backend`
5. Railway will auto-detect Node.js
6. **Copy the generated URL**: `https://xxx.railway.app`

### Step 3: Deploy Frontend (Vercel)
1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Select your repo
4. **Root Directory**: `frontend`
5. **Environment Variables**:
   - Name: `REACT_APP_BACKEND_URL`
   - Value: `https://xxx.railway.app` (from Step 2)
6. Click "Deploy"

### Step 4: Update Backend
1. Go back to Railway dashboard
2. **Variables** → Add:
   - `FRONTEND_URL` = `https://your-app.vercel.app`
3. Railway will auto-redeploy

### ✅ Done!
Visit your Vercel URL and start watching! 🎬

---

## Alternative: Deploy Both on Railway

If you prefer simpler setup:

1. Go to https://railway.app
2. Deploy entire project (not just backend)
3. Add "Start Command": `cd backend && npm install && node server.js`
4. Add "Frontend Deploy": Railway will handle it
5. Set environment variables

Railway will host both on one platform!
