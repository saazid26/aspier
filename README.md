# ASPIER Platform

Production-grade academic, research, and academy platform.

## Local development

```bash
npm run install:all
npm run dev
```

Frontend: http://localhost:5173

Backend health: http://localhost:5000/api/v1/health

Administrator sign-in is restricted to `admin@gmail.com`. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the ignored `server/.env`; never put a live password in tracked source or documentation. The development seed synchronizes that account from the configured credentials. Admin login is direct until Strong 2FA is explicitly enabled under **Admin → Security**.

Demo student: `student@aspier.org` / `Student@1234`

The server automatically uses an in-memory MongoDB instance when `MONGO_URI` is empty or unavailable in development. Email delivery is not used; applicant and member updates are delivered through the in-app notification center and Admin UI.

## Admin content and membership workflow

- Manage Wings, Research, team profiles, News, and Academy courses under `/admin/resources/*`. Image upload controls provide slot-specific size recommendations, client-side size limits, and previews.
- The default research-writing course is seeded automatically. Edit course details and fee under **Admin → ASPIER Academy / Courses** and edit/reorder its syllabus under **Curriculum**.
- Edit site identity, homepage artwork, founder profile, payment numbers, and the BDT 1,000 initial membership fee under **Admin → Site & payment settings**.
- Applicants submit `/join`, save the application ID and private access code shown once, and use `/join/portal` to check review status and complete Stage 2.
- Stage 1 is free. Supervisors submit a profile in Stage 2 and are published after admin approval with no payment step. Young Scholars submit their profile, photo, and BDT 1,000 bKash/Nagad TrxID together in Stage 2; admins verify the TrxID before publishing.
- bKash and Nagad default to `01603012448`. Student course enrollments continue to use their separate course-payment flow.
- Approved applicants receive status and one-time activation credentials in the secure applicant notification center. Member activation requires a unique `@gmail.com` address and a strong password.
- Admin notifications cover new applications, membership submissions, course payments, and contact inquiries. Admin and signed-in member notification bells refresh automatically and support read/unread tracking.
- Admin sign-in initially requires the configured email and password only. Security Settings can activate or update TOTP plus a hashed Strong Master Authentication Key; disabling or updating protection requires the current key and authenticator code.
- Applicants can open the same sign-up form from the navigation **Sign Up** action or the notification bell. Administrators review submissions under **Admin → Membership applications**, assign the Application ID and Private Access Code, then approve and share the credentials from the Admin UI. Applicant portal access requires authenticator verification.
- Admin image upload controls use a centered circular preview frame and recommend 400 × 400 px (1:1), max 2 MB. Public cover images retain responsive display sizing and center-cropping.

## Vercel deployment

Deploy the `aspier` workspace as one Vercel project:

1. In Vercel, set **Root Directory** to the directory containing this root `package.json` and `vercel.json` (the workspace root, not `client` or `server`). Do not override the commands in `vercel.json`: it runs `npm ci`, `npm run build`, and publishes `client/dist`.
2. The root `api/index.ts` function forwards rewritten `/api/v1/*` requests to the Express application and connects to MongoDB once per warm function instance. The Vercel rewrites serve the built React app for browser routes. Leave `VITE_API_BASE_URL` unset to use same-origin `/api/v1`; this keeps cookie and CSRF behavior same-origin.
3. Configure these Vercel environment variables for every environment you deploy:
   - `ADMIN_EMAIL`: fixed administrator email.
   - `ADMIN_PASSWORD`: fixed administrator password, at least 12 characters.
   - `MONGO_URI`: reachable MongoDB connection string (MongoDB Atlas is suitable); Vercel cannot use the development in-memory database.
   - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: different random secrets, each at least 32 characters.
   - `FIELD_ENC_KEY`: a persistent secret for encrypting protected fields; do not rotate it without migrating encrypted data.
   - `CLIENT_URL`: the exact deployed site origin, such as `https://your-project.vercel.app`, for CORS.
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` for persistent uploads. Without Cloudinary, Vercel stores uploaded images as data URLs in MongoDB rather than writing to its read-only filesystem.
4. Seed the production database once from a trusted environment with the same production variables: `npm run seed --workspace @aspier/server`. Do not run seeding on every serverless request. Keep pulled environment files out of version control.
5. (Optional) Configure transactional email delivery (SMTP):
   - `SMTP_HOST`: e.g., `smtp.gmail.com`
   - `SMTP_PORT`: `587` (TLS) or `465` (SSL)
   - `SMTP_USER`: sender email address
   - `SMTP_PASS`: app password or SMTP token
   - `SMTP_FROM`: display sender header (e.g., `ASPIER <no-reply@aspier.org>`)
   When configured, emails are dispatched for password resets, membership application approvals, account activations, and course enrollment approvals/rejections. When left unset, the platform falls back smoothly to in-app notifications and logging without breaking requests.
6. Dynamic XML Sitemap:
   - Available automatically at `/sitemap.xml`.
   - Vercel forwards requests for `/sitemap.xml` directly to `/api/v1/public/sitemap.xml`, indexing all published Wings, Research articles, Academy courses, News, and Scholar/Supervisor profiles.

The development server remains unchanged: Vite proxies `/api` to localhost, while the production frontend and API share the Vercel origin. Configure production database, JWT, and field-encryption secrets in Vercel Project Settings; see `server/.env.example` for the complete reference list.
