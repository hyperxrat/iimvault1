# VaultDrop — Setup Guide 🚀

## Project Structure
```
vaultdrop/
├── public/
│   └── index.html       ← Frontend website
├── api/
│   ├── verify-payment.js  ← Verifies Razorpay payment, gives token
│   └── download.js        ← Streams file to user (URL never exposed)
├── vercel.json            ← Vercel config
└── README.md
```

---

## Step 1 — Google Drive File ID

1. Upload your PDF to Google Drive
2. Right click → **Share** → **Anyone with the link** → Copy link
3. Link looks like:
   `https://drive.google.com/file/d/ABCDEF123456/view`
4. Copy that middle part: `ABCDEF123456` → this is your **File ID**

---

## Step 2 — Razorpay Keys

1. Go to [razorpay.com](https://razorpay.com) → Sign up
2. Dashboard → Settings → API Keys → **Generate Test Key**
3. You'll get:
   - **Key ID** → starts with `rzp_test_...`
   - **Key Secret** → keep this SECRET, never share

---

## Step 3 — Edit index.html

Open `public/index.html` and find this line:

```js
const RAZORPAY_KEY_ID = "rzp_test_XXXXXXXXXXXXXXXX";
```

Replace with your Key ID.

---

## Step 4 — Deploy to Vercel

1. Install Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Inside the `vaultdrop` folder, run:
   ```
   vercel
   ```

3. Follow the prompts (login with GitHub, give project a name)

4. After deploy, Vercel will give you a URL like:
   `https://vaultdrop-xyz.vercel.app`

---

## Step 5 — Add Environment Variables (IMPORTANT)

In Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

Add these 3 variables:

| Name | Value |
|------|-------|
| `RAZORPAY_KEY_SECRET` | Your Razorpay Secret Key |
| `GOOGLE_DRIVE_FILE_ID` | Your Google Drive File ID |

Click **Save** → then **Redeploy** the project.

---

## How it works (Security)

```
User clicks Pay
  → Razorpay popup opens
  → User pays
  → Razorpay sends payment_id to frontend
  → Frontend sends payment_id to /api/verify-payment
  → Server verifies signature with Razorpay (proves payment is real)
  → Server generates ONE-TIME token (expires in 5 min)
  → Frontend uses token to hit /api/download
  → Server streams PDF directly from Google Drive
  → User gets file — Google Drive URL never exposed
  → Token is destroyed after use
```

✅ File URL never visible in browser
✅ Token expires in 5 minutes
✅ Token is single-use only
✅ Payment signature verified server-side

---

## Go Live (Real Payments)

1. Complete KYC on Razorpay dashboard
2. Generate **Live Keys** (starts with `rzp_live_...`)
3. Replace in `index.html` and Vercel env variables
4. Done!
