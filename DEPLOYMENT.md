# 🚀 Smart Clinic — Complete Free Tier Deployment Guide

A step-by-step production deployment manual to host the entire **Smart Clinic** platform for **100% free** using **Neon** (PostgreSQL), **Render** (Django REST Backend), **Vercel** (React Vite Frontend), and **Cloudinary** (Media & Medical Reports).

---

## 🏛️ Deployment Architecture & Free Tier Stack

```mermaid
flowchart LR
    Browser["Client Browser / Mobile Devices"]
    Vercel["Frontend: Vercel (Hobby Tier)\nReact 19 + Vite 8 SPA\nEdge CDN, Free SSL, 100GB/mo"]
    Render["Backend: Render (Free Web Service)\nDjango 5 + DRF + Gunicorn + WhiteNoise\n512MB RAM, Auto GitHub CD"]
    Neon["Database: Neon (Serverless Postgres)\nPostgreSQL 16, 0.5GB Storage\nPermanent Free Tier, SSL Enforced"]
    Cloudinary["Storage: Cloudinary (Free Tier)\n25GB Storage & Bandwidth\nPrescriptions & Lab Reports"]

    Browser -->|"HTTPS (smartclinic.vercel.app)"| Vercel
    Vercel -->|"REST API / Bearer JWT (/api/v1)"| Render
    Render -->|"PostgreSQL (sslmode=require)"| Neon
    Render -->|"Upload / Fetch Documents"| Cloudinary
```

| Layer | Provider | Free Tier Allocation | Responsibility |
| :--- | :--- | :--- | :--- |
| **Database** | **[Neon](https://neon.tech)** | 0.5 GB storage, serverless autoscaling compute | Primary PostgreSQL database with immutable queue serials and ACID transactions. |
| **Backend API** | **[Render](https://render.com)** | 512 MB RAM, 750 free instance hours/month | Django REST API, SimpleJWT authentication, queue engine, WhiteNoise static assets. |
| **Frontend SPA** | **[Vercel](https://vercel.com)** | 100 GB bandwidth/mo, unlimited deployments | React 19 SPA, Tailwind CSS v4, DaisyUI 5, instant global Edge CDN delivery. |
| **Media Storage** | **[Cloudinary](https://cloudinary.com)** | 25 GB managed storage & bandwidth/month | Medical lab test reports, doctor profile avatars, clinic facility galleries. |

> [!NOTE]
> **Render Free Tier Spin-Down**: Render's free instance spins down into sleep mode after 15 minutes of inactivity. The first request after idle takes ~30–50 seconds for cold start. Subsequent requests execute instantly.

---

## 📋 Pre-Deployment Checklist

Before you begin, ensure you have:
- [x] A **GitHub account** with access to this repository.
- [x] A **Neon account** ([neon.tech](https://neon.tech))
- [x] A **Render account** ([render.com](https://render.com))
- [x] A **Vercel account** ([vercel.com](https://vercel.com))
- [x] A **Cloudinary account** ([cloudinary.com](https://cloudinary.com)) *(free registration takes 1 minute)*

---

## 🗄️ Step 1: Provision Neon PostgreSQL Database

1. Log in to [neon.tech](https://neon.tech) and click **New Project**.
2. Set the project name (e.g. `smart-clinic-db`), select PostgreSQL version `16`, and choose the cloud region closest to your users (e.g. `AWS - ap-southeast-1` Singapore or `us-east-2`).
3. In your Neon Dashboard, locate the **Connection Details** card:
   - Select **Pooled connection** or **Direct connection**.
   - Copy the `Connection String`:
     ```text
     postgresql://neondb_owner:npg_sample123@ep-sample-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
     ```
4. Save this `DATABASE_URL` string — you will paste it directly into Render in Step 3.

---

## ☁️ Step 2: Provision Cloudinary Free Media Storage

1. Sign up or log in at [cloudinary.com](https://cloudinary.com).
2. Go to your **Cloudinary Dashboard**.
3. Under the **Product Environment Credentials** section, copy:
   - `Cloud Name` (e.g. `dxyza123`)
   - `API Key` (e.g. `987654321012345`)
   - `API Secret` (e.g. `abcdef1234567890`)
4. Save these 3 keys for Step 3.

---

## ⚙️ Step 3: Deploy Django Backend on Render

1. Log in to [render.com](https://render.com) and click **New + > Web Service**.
2. Select **Build and deploy from a Git repository** and connect your GitHub repo `Final_Year_Project_version1`.
3. Configure the service parameters:

| Field | Configuration Value |
| :--- | :--- |
| **Name** | `smartclinic-api` *(or your preferred slug)* |
| **Region** | Singapore or Oregon (select region closest to Neon DB) |
| **Branch** | `main` |
| **Root Directory** | `clinic_backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `./build.sh` *(or `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`)* |
| **Start Command** | `gunicorn config.wsgi:application` |
| **Instance Type** | `Free` (512 MB) |

4. Scroll down to **Environment Variables** and add the following keys:

| Environment Variable | Recommended Value | Notes |
| :--- | :--- | :--- |
| `DEBUG` | `False` | Enforces production security checks |
| `SECRET_KEY` | *(Generate a 50+ character random string)* | E.g. run `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DATABASE_URL` | `postgresql://...from Neon...` | Direct connection string from Neon |
| `BACKEND_URL` | `https://backend-smart-clinic.onrender.com` | Your Render web service public URL |
| `FRONTEND_URL` | `https://final-year-project-version1.vercel.app` | Your Vercel frontend URL |
| `CORS_ALLOWED_ORIGINS` | `https://final-year-project-version1.vercel.app` | Comma-separated allowed frontend domains |
| `CSRF_TRUSTED_ORIGINS` | `https://final-year-project-version1.vercel.app` | Comma-separated trusted origins |
| `CLOUDINARY_CLOUD_NAME` | *(Your Cloudinary Cloud Name)* | From Step 2 |
| `CLOUDINARY_API_KEY` | *(Your Cloudinary API Key)* | From Step 2 |
| `CLOUDINARY_API_SECRET` | *(Your Cloudinary API Secret)* | From Step 2 |
| `SSLCOMMERZ_IS_SANDBOX` | `True` | Set to True for testing |
| `SSLCOMMERZ_STORE_ID` | `testbox` | Default sandbox store ID |
| `SSLCOMMERZ_STORE_PASS` | `qwerty` | Default sandbox store pass |
| `SMS_GATEWAY_PROVIDER` | `SIMULATED` | Use simulated gateway on free tier |

> [!TIP]
> **Automatic Hostname Resolution**: The backend automatically reads `RENDER_EXTERNAL_HOSTNAME` and adds it to Django's `ALLOWED_HOSTS`. You do not need to manually configure `ALLOWED_HOSTS` unless you attach a custom domain.

5. Click **Create Web Service**. Render will execute `clinic_backend/build.sh`, install all requirements, run `collectstatic`, and apply all database migrations to Neon.
6. Once deployed, open the **Shell** tab in your Render dashboard and create the platform Super Administrator:
   ```bash
   python manage.py createsuperuser
   ```
   Follow the prompts to enter username, email, and password.

---

## 💻 Step 4: Deploy React Frontend on Vercel

1. Log in to [vercel.com](https://vercel.com) and click **Add New... > Project**.
2. Import your GitHub repository `Final_Year_Project_version1`.
3. Configure the project:
   - **Framework Preset**: `Vite` *(auto-detected)*
   - **Root Directory**: Click `Edit` and select `smart-clinic`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Expand **Environment Variables** and add:
   - `VITE_API_BASE_URL` = `https://backend-smart-clinic.onrender.com/api/v1`
5. Click **Deploy**. Vercel will build the frontend in ~20 seconds and provide your live URL (`https://final-year-project-version1.vercel.app`).

> [!IMPORTANT]
> **Client-Side SPA Routing**: This repository includes [`smart-clinic/vercel.json`](file:///d:/Projects/smart-clinic/vercel.json) with client-side SPA route rewrites:
> ```json
> {
>   "rewrites": [
>     { "source": "/(.*)", "destination": "/index.html" }
>   ]
> }
> ```
> This prevents 404 Not Found errors when reloading routes like `/dashboard`, `/login`, or `/doctors/:id`.

---

## 🔗 Step 5: Synchronize CORS & Allowed Origins

Once Vercel assigns your production domain (e.g. `https://smart-clinic-six.vercel.app`):

1. Go back to your **Render Dashboard > smartclinic-api > Environment**.
2. Verify/Update the cross-origin variables to match your exact Vercel URL:
   - `FRONTEND_URL` = `https://smart-clinic-six.vercel.app`
   - `CORS_ALLOWED_ORIGINS` = `https://smart-clinic-six.vercel.app`
   - `CSRF_TRUSTED_ORIGINS` = `https://smart-clinic-six.vercel.app`
3. Click **Save Changes**. Render will automatically redeploy the backend with the new origins in ~1 minute.

---

## 🧪 Step 6: Production Verification & Smoke Testing

After both services are live, verify all clinical workflows:

| Workflow | Target URL | Verification Criteria |
| :--- | :--- | :--- |
| **API Health & Docs** | `https://smartclinic-api.onrender.com/api/v1/schema/swagger-ui/` | Swagger interactive OpenAPI documentation renders without 500 errors. |
| **Admin Login** | `https://smartclinic-api.onrender.com/admin/` | Log in with the credentials created via `createsuperuser`. |
| **Frontend Public Web** | `https://your-frontend.vercel.app` | Homepage renders with clinic cards, specialist carousel, and navigation bar. |
| **Patient Authentication** | `https://your-frontend.vercel.app/login` | Log in or register new patient; verify JWT tokens are saved in `localStorage`. |
| **Token Booking** | `https://your-frontend.vercel.app/doctors` | Select doctor, book appointment slot, verify live token serial generation. |
| **Receptionist Desk** | `https://your-frontend.vercel.app/dashboard` | Log in as receptionist; test instant walk-in token issuance and thermal print preview. |
| **Waiting Room TV** | `https://your-frontend.vercel.app/queue-display` | Verify live chamber callouts and bilingual Bengali/English speech synthesis. |

---

## 🛠️ Troubleshooting & Frequently Asked Questions

### 1. `400 Bad Request` on Render
* **Cause**: Hostname is missing from `ALLOWED_HOSTS`.
* **Fix**: Ensure Render's `RENDER_EXTERNAL_HOSTNAME` variable is present, or add `your-app.onrender.com` to `ALLOWED_HOSTS`.

### 2. `CORS Policy Blocked` in Browser DevTools
* **Cause**: Mismatch between Vercel URL and Render's `CORS_ALLOWED_ORIGINS`.
* **Fix**: Ensure `CORS_ALLOWED_ORIGINS` in Render matches your exact Vercel URL **without trailing slash** (e.g. `https://smart-clinic.vercel.app`).

### 3. `404 Not Found` when refreshing page on Vercel
* **Cause**: Vercel web server treats React Router subpaths as missing static files.
* **Fix**: Verify [`smart-clinic/vercel.json`](file:///d:/Projects/smart-clinic/vercel.json) exists with rewrite rule to `/index.html`.

### 4. `SSL connection error` connecting to Neon DB
* **Cause**: Missing `sslmode=require`.
* **Fix**: Ensure your `DATABASE_URL` ends with `?sslmode=require`. [`settings.py`](file:///d:/Projects/clinic_backend/config/settings.py) automatically enforces `sslmode: require` for non-localhost hosts.

### 5. Media upload fails or avatars disappear
* **Cause**: Ephemeral filesystem on Render wipes local `/media/` folder on container restart.
* **Fix**: Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in Render environment variables so files upload to Cloudinary.

