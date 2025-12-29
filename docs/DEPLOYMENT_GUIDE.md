# 🚀 SafeDocs Deployment Guide (Vercel + Backend)

This guide will help you deploy the SafeDocs platform and the AI Scanning Engine to production.

## 🏗️ Architecture Overview

For a reliable production setup, we recommend:
1.  **Frontend/API (Platform)**: Vercel (Next.js)
2.  **Database**: Neon.tech or Supabase (PostgreSQL)
3.  **Engine (AI Scanner)**: Railway or Render (FastAPI)
4.  **File Storage**: AWS S3 or Google Cloud Storage (Recommended)

---

## 1. Deploy the PostgreSQL Database

SafeDocs requires a PostgreSQL database.

1.  Sign up for **[Neon](https://neon.tech)** or **[Supabase](https://supabase.com)**.
2.  Create a new project/database.
3.  Copy the **Connection String** (Database URL).
4.  Run the prisma migrations:
    ```bash
    cd platform
    npx prisma generate
    npx prisma db push
    ```

---

## 2. Deploy the AI Engine (Python)

The engine handles heavy ML workloads and requires a long-running server. We recommend **Railway** or **Render**.

### Option A: Railway (Easiest)
1.  Connect your GitHub to **[Railway.app](https://railway.app)**.
2.  Select the `SafeDocs` repository.
3.  Set the **Root Directory** to `engine`.
4.  Railway will auto-detect the `requirements.txt` and start the FastAPI server.
5.  **Environment Variables**:
    *   `PORT`: 8000
    *   `MONGO_URI`: (Your MongoDB connection string if using GridFS)
6.  Copy the generated URL (e.g., `https://engine-production.up.railway.app`).

---

## 3. Deploy the Platform (Vercel)

1.  Connect your GitHub to **[Vercel](https://vercel.com)**.
2.  Import the `SafeDocs` project.
3.  Set **Root Directory** to `platform`.
4.  **Important Environment Variables**:
    *   `DATABASE_URL`: Your PostgreSQL URL from Step 1.
    *   `ENGINE_URL`: Your Engine URL from Step 2.
    *   `NEXTAUTH_SECRET`: Generate a random string.
    *   `NEXTAUTH_URL`: Your Vercel deployment URL (e.g., `https://safedocs.vercel.app`).
    *   `STRIPE_SECRET_KEY`: From Stripe Dashboard.
    *   `STRIPE_WEBHOOK_SECRET`: From Stripe Dashboard.
    *   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: For Google Login.

---

## ⚠️ Important: File Storage

### Current Setup (Local Disk)
Currently, SafeDocs saves files to the `platform/storage` folder. 
**Vercel is stateless and read-only.** Files saved during a scan will be lost when the server restarts (which happens frequently).

### Recommended Fix for Production:
Switch the file saving logic in `platform/src/app/api/scan/route.ts` to use a cloud provider:

1.  **Cloudinary** (Images/Docs)
2.  **AWS S3**
3.  **Uploadthing** (Easiest for Next.js)

#### Example (Uploadthing Migration):
We have structured the `Scan` model with a `report` field (JSONB). You can save the public URL of the uploaded file there and in `originalPath`.

---

## 🛠️ Performance Tuning

If you notice timeouts on Vercel:
1.  Increase the **Serverless Function Timeout** in Vercel settings (Pro plan).
2.  Alternatively, use **Vercel Edge Runtime** for the API routes if they don't depend on Node-specific libraries (not possible for the current `form-data` implementation).

## 📊 Monitoring

*   **Vercel Logs**: Monitor API failures.
*   **Stripe Events**: Ensure webhooks are arriving correctly.
*   **Prism Studio**: View your database entries with `npx prisma studio`.

---

**Need Help?** Join the community or check the documentation in the `/docs` folder.
