# DSLC Warehouse App

Next.js app for DSLC warehouse transactions, inventory checks, and admin tools.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment sample:

   ```bash
   cp .env.local.example .env.local
   ```

3. Set `NEXT_PUBLIC_APPS_SCRIPT_URL` to your deployed Google Apps Script Web App URL.

4. Run the app:

   ```bash
   npm run dev
   ```

## Deploy to Vercel

Add this environment variable in Vercel Project Settings:

```text
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/your-deployment-id/exec
```

Then deploy with the default Vercel Next.js settings.
