# Deployment Guide for Movie Watch Party

## Architecture
- **Frontend**: Deployed on Vercel
- **Backend**: Deployed on Railway/Render (supports WebSocket)

---

## Part 1: Deploy Backend to Railway

### Option A: Using Railway (Recommended)

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Deploy Backend**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Navigate to backend folder
   cd backend
   
   # Initialize and deploy
   railway init
   railway up
   ```

3. **Set Environment Variables in Railway Dashboard**
   - Go to your project → Variables
   - Add: `FRONTEND_URL=https://your-vercel-app.vercel.app`

4. **Copy the Backend URL**
   - Railway will give you a URL like: `https://your-app.railway.app`
   - **Save this URL** - you'll need it for frontend

### Option B: Using Render (Alternative)

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Add Environment Variable:
   - `FRONTEND_URL=https://your-vercel-app.vercel.app`
6. Copy the backend URL

---

## Part 2: Deploy Frontend to Vercel

1. **Update Environment Variable**
   - Edit `frontend/.env.production`
   - Replace `YOUR_BACKEND_URL_HERE` with your Railway/Render backend URL
   ```
   REACT_APP_BACKEND_URL=https://your-backend-url.railway.app
   ```

2. **Deploy to Vercel**

   **Option A: Using Vercel CLI**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Navigate to frontend
   cd frontend
   
   # Deploy
   vercel
   
   # For production
   vercel --prod
   ```

   **Option B: Using Vercel Dashboard**
   - Go to https://vercel.com
   - Click "Add New" → "Project"
   - Import your GitHub repo
   - Settings:
     - **Framework Preset**: Create React App
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Output Directory**: `build`
   - Add Environment Variable:
     - `REACT_APP_BACKEND_URL` = Your backend URL
   - Click "Deploy"

3. **Update Backend CORS**
   - Go back to Railway/Render dashboard
   - Add environment variable:
   - `FRONTEND_URL=https://your-vercel-app.vercel.app`
   - Redeploy backend

---

## Part 3: Test Deployment

1. Open your Vercel URL: `https://your-app.vercel.app`
2. Create a room
3. Open in another browser/incognito
4. Join the same room
5. Test video streaming and sync

---

## Troubleshooting

### Issue: "Connection failed"
- Check backend logs in Railway/Render
- Verify CORS settings
- Ensure environment variables are set correctly

### Issue: "WebSocket transport error"
- Railway/Render automatically supports WebSocket
- Check if backend is running: `curl https://your-backend-url.railway.app`

### Issue: Video not streaming
- Check browser console for errors
- Verify both frontend and backend are deployed
- Test backend endpoint directly

---

## Cost

- **Railway**: Free tier (500 hours/month)
- **Render**: Free tier (750 hours/month)
- **Vercel**: Free tier (100 GB bandwidth/month)

**Total Cost: $0** for hobby projects! 🎉

---

## Quick Commands Reference

```bash
# Backend (Railway)
cd backend
railway login
railway init
railway up
railway logs

# Frontend (Vercel)
cd frontend
vercel
vercel --prod
vercel logs
```
