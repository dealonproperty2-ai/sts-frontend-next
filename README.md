# Step To Soft — Next.js Frontend + Backend

This is the unified Next.js 14 (App Router) build for `steptosoft.com`. It serves the marketing
site, the Academy course pages, and the backend API (enquiries, applications, courses, auth)
from a single Node server. The original Angular code is preserved in `_legacy_angular/`.

## Highlights

- **Next.js 14 App Router** with TypeScript and React 18.
- **SEO-first**: per-page `metadata`, dynamic `sitemap.xml`, `robots.txt`, JSON-LD for Organization,
  WebSite, ProfessionalService, ItemList, Course, JobPosting, ContactPage; canonical URLs;
  Open Graph image generated at the edge from `opengraph-image.tsx`; PWA manifest.
- **Mobile responsive** via fluid `clamp()` typography and CSS grid breakpoints (980 / 880 / 640).
- **Backend in-process**: `/api/enquiry`, `/api/apply`, `/api/courses`, `/api/auth/*`, `/api/health`.
  MongoDB Atlas via Mongoose with serverless connection caching, in-memory rate limiting, and
  Nodemailer for transactional email.

## Running locally

```bash
cd C:\test\sts-frontend
copy .env.example .env.local
# fill in MONGODB_URI, JWT_SECRET, SMTP_USER, SMTP_PASS, ADMIN_EMAILS
npm install
npm run dev
```

Open <http://localhost:3000>. The API is on the same origin, e.g. `http://localhost:3000/api/enquiry`.

## Project layout

```
src/
  app/
    layout.tsx          # root layout, fonts, JSON-LD, Nav, Footer
    page.tsx            # /
    about/, services/, courses/, courses/[slug]/, careers/, contact/, privacy/, terms/
    not-found.tsx       # global 404
    sitemap.ts          # dynamic sitemap.xml
    robots.ts           # robots.txt
    manifest.ts         # PWA manifest.webmanifest
    icon.tsx, apple-icon.tsx, opengraph-image.tsx
    api/
      enquiry/route.ts        # POST: contact form
      apply/route.ts          # POST: careers form
      courses/route.ts        # GET: list
      courses/[slug]/route.ts # GET: by id
      auth/login/route.ts
      auth/send-otp/route.ts
      auth/verify-otp/route.ts
      health/route.ts
  components/           # Nav, Footer, Logo, Icon, Primitives, Parallax, HomeSections, CTABanner
  lib/courses.ts        # static course catalog + curriculum
  server/
    db.ts               # cached mongoose connect()
    rateLimit.ts        # in-memory token bucket
    mailer.ts           # nodemailer transporter + templates
    validation.ts       # email/string helpers
    models/             # Enquiry, Application, User, Otp
  styles/globals.css    # design tokens + utilities
public/
  team/*.jpg            # team imagery (from sts_ui_claude_design)
  icon.svg, favicon.svg
```

## Environment

| Var             | Purpose                                               |
| --------------- | ----------------------------------------------------- |
| `MONGODB_URI`   | MongoDB Atlas connection string                       |
| `JWT_SECRET`    | Min 32 chars, used for `/api/auth/*` tokens           |
| `SITE_URL`      | Canonical origin for `metadataBase`, sitemap, JSON-LD |
| `SMTP_USER`     | Gmail (or other) sender address                       |
| `SMTP_PASS`     | App password — never the account password            |
| `ADMIN_EMAILS`  | Comma-separated recipients for enquiry/application notifications |

When `SMTP_USER`/`SMTP_PASS` are absent, the form endpoints still save to MongoDB and return
success — they just skip the mail step. Useful for local dev.

## SEO checklist

- [x] Per-page `<title>` / meta description with `metadataBase` and template
- [x] Canonical URLs via `alternates.canonical`
- [x] Open Graph + Twitter card metadata, generated OG image at `/opengraph-image`
- [x] `sitemap.xml` (dynamic, includes course detail pages)
- [x] `robots.txt` (disallows `/api/`, `_legacy_angular`, `GPTBot`)
- [x] JSON-LD: Organization, WebSite, ProfessionalService, ItemList × 2, Course, JobPosting,
      ContactPage
- [x] PWA `manifest.webmanifest` + `theme-color`
- [x] Skip-to-content link, semantic `<main>`, `aria-label`s on icons
- [x] Long-cache headers for static assets in `next.config.mjs`

## Migrating from the legacy Express backend

The legacy `sts-backend` (Express + Mongoose) covered:

- enquiry CRUD, apply-course (with file upload), course CRUD, OTP/login, candidate/batch/plot.

The Next API routes here cover the public-facing surface (enquiry, apply, courses, auth).
The admin-only endpoints (candidate, batch, plot, S3 uploads, super-admin creation) were not
ported; if you still need them, run them as separate Express services or extend `src/app/api/`.

## Deploying

The app is a standard Next.js Node server. Build with `npm run build`, run with `npm run start`.
Set `SITE_URL=https://steptosoft.com` in production so canonical URLs and OG resolve correctly.
