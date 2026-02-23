# 🍁 How to Deploy MapleETF to GitHub Pages

## What You Need
- A **GitHub account** (free) → [github.com](https://github.com)
- **Git** installed on your computer → [git-scm.com](https://git-scm.com/downloads)
- **Node.js** installed (v18+) → [nodejs.org](https://nodejs.org)

---

## Step-by-Step Guide

### Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. **Repository name**: `mapleetf` (or whatever you want)
3. Set it to **Public** (required for free GitHub Pages)
4. **DON'T** check "Add a README" (we already have files)
5. Click **Create repository**

---

### TESTING ###
### Step 2: Push Your Code to GitHub

Open a terminal/command prompt in your project folder and run these commands **one by one**:

```bash
# Initialize git in your project folder
git init

# Add all files
git add .

# Create your first commit
git commit -m "Initial commit - MapleETF"

# Connect to your GitHub repo (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/mapleetf.git

# Push the code
git branch -M main
git push -u origin main
```

> 💡 **First time using Git?** GitHub will ask you to sign in. 
> A browser window will pop up — just click "Authorize".

---

### Step 3: Enable GitHub Pages

1. Go to your repo on GitHub: `github.com/YOUR_USERNAME/mapleetf`
2. Click **Settings** (gear icon, top menu)
3. In the left sidebar, click **Pages**
4. Under **Source**, select **GitHub Actions**
5. That's it! The workflow file we created will handle everything.

---

### Step 4: Wait for Deployment

1. Go to the **Actions** tab in your repo
2. You should see a workflow running called "Deploy to GitHub Pages"
3. Wait 1-2 minutes for it to finish (green checkmark = success ✅)
4. Your app is now live at:

```
https://YOUR_USERNAME.github.io/mapleetf/
```

---

### Step 5: Install on Your Android Phone

1. Open **Chrome** on your Android phone
2. Go to `https://YOUR_USERNAME.github.io/mapleetf/`
3. You'll see an **"Install MapleETF"** banner — tap **Install**
4. OR tap the **⋮ three dots menu** → **"Add to Home screen"** → **Add**
5. MapleETF now appears on your home screen like a real app! 🎉

---

## Updating Your App

Whenever you make changes, just push to GitHub and it auto-deploys:

```bash
git add .
git commit -m "Updated something"
git push
```

Wait 1-2 minutes and your live site updates automatically.

---

## Troubleshooting

### "Page not found" or blank page
This is usually a base path issue. Open `vite.config.ts` and add the `base` option:

```typescript
export default defineConfig({
  base: '/mapleetf/',  // ← Must match your repo name!
  plugins: [react(), tailwindcss()],
  // ... rest of config
})
```

Then push again:
```bash
git add .
git commit -m "Fix base path"
git push
```

### "Actions" tab shows a red X (build failed)
1. Click on the failed run to see the error
2. Most common fix: make sure `npm run build` works on your computer first
3. If you see dependency errors, delete `node_modules` and `package-lock.json`, then run `npm install` again

### The PWA install prompt doesn't appear
- Make sure you're using **Chrome** (not Firefox/Samsung browser)
- The site must be served over **HTTPS** (GitHub Pages does this automatically)
- You need to visit the site **twice** — Chrome requires engagement before showing the install prompt
- Try: ⋮ menu → "Add to Home screen" as a manual fallback

### Data isn't loading
- The app uses Yahoo Finance via CORS proxies
- If proxies are temporarily down, the app shows demo data
- Try the refresh button (🔄) in the app header
- Data auto-refreshes every 30 minutes

---

## Alternative: Custom Domain (Optional)

If you own a domain (e.g., `mapleetf.ca`):

1. In your repo, go to **Settings** → **Pages**
2. Under **Custom domain**, enter your domain
3. Add these DNS records at your domain registrar:
   - **A records** pointing to:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - **CNAME record**: `www` → `YOUR_USERNAME.github.io`
4. Check "Enforce HTTPS"
5. Wait 10-30 minutes for DNS to propagate

---

## Alternative Hosting (Even Easier)

If GitHub Pages feels complicated, try **Netlify** instead:

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Run `npm run build` on your computer
3. Drag and drop the `dist` folder onto the Netlify page
4. Done! You get a URL like `random-name.netlify.app` instantly
5. Open that URL on your phone → Install as PWA

---

## Questions?

The app is a Progressive Web App (PWA), which means:
- ✅ Installs like a native app on Android
- ✅ Works offline (cached data)
- ✅ No app store needed
- ✅ Auto-updates when you push new code
- ✅ Free hosting on GitHub Pages
