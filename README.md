# KaviosPix 📸

> MERN stack photo management with Google OAuth, Cloudinary storage, and album sharing.

**Frontend App (Vercel)**: https://image-app-frontend-mu.vercel.app/

**Backend API (Render)**: https://imageapp-backend.onrender.com/

**Frontend Repository**: [https://github.com/Rakeshneopane/kaviosPix-frontend]

**Backend Repository**: [https://github.com/Rakeshneopane/kaviosPix-backend]

---

## Project Structure

| Repository | Description |
|------------|-------------|
| Backend | Node.js, Express, MongoDB, Google OAuth, Cloudinary |
| Frontend | React, Redux Toolkit, Vite |

---

## 📖 Table of Contents

- [Overview](#overview)
- [Why I Built This](#why-i-built-this)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Implementation Highlights](#implementation-highlights)
- [API Reference](#api-reference)
- [Database Design](#database-design)
- [The Pain Points](#the-pain-points)
- [Security](#security)
- [Local Setup](#local-setup)
- [What I'd Do Differently](#what-id-do-differently)
- [Roadmap](#roadmap)

---

## Overview

KaviosPix lets users organize photos into albums, bulk upload to Cloudinary, tag images, mark favorites, add comments, and share albums with other users — all behind Google OAuth and HTTP-only JWT cookies.

Built as a backend-focused project to explore authentication, authorization, file uploads, and cloud-based media management in a production-like environment.

---

## Why I Built This

I wanted a project that forced me to deal with the parts of full-stack development that usually look simple until you deploy them.

On paper, photo management sounds straightforward: authentication, albums, uploads, sharing, comments, favorites.

In practice, getting Google OAuth, cross-origin cookies, cloud storage, authorization, and file uploads working together exposed a completely different set of problems.

Most of the learning came from debugging things that worked perfectly on localhost and then immediately broke after deployment.

Every major section of this project taught me something:

1. **OAuth** taught me how unforgiving redirect URI configuration can be.
2. **HTTP-only cookies** taught me how browsers actually handle authentication across origins.
3. **File uploads** taught me why memory usage matters.
4. **Authorization** taught me the difference between proving identity and proving ownership.
5. **Production debugging** taught me that "works on my machine" is not a deployment strategy.

The finished application matters less than the lessons learned while building it.

---

## Features

### Authentication
- 🔐 **Google OAuth 2.0** — No passwords stored
- 🍪 **HTTP-only JWT cookies** — XSS can't read what JavaScript can't touch
- 👤 **Auto user creation** — First login upserts the user record

### Albums
- 📁 **Full CRUD** — Create, update, delete, get
- 🏠 **Auto default album** — Created automatically on first `GET /album/all`
- 👥 **Sharing** — Share albums with other users via `$addToSet`
- 🛡️ **Owner-only mutations** — Two-layer guard: JWT + `isOwner`

### Images
- 📤 **Bulk upload** — Up to 15 images at once via Cloudinary
- ⭐ **Favorites** — Toggle + filter
- 🏷️ **Tags** — Add tags, filter by tag
- 💬 **Comments** — Per-image, appended via `$push`
- 🗑️ **Clean deletes** — Removes from DB *and* Cloudinary

### Infrastructure
- 📄 **Pagination** — Every list endpoint supports `page` + `limit`
- ⚡ **Compound indexes** — Optimized for common query patterns

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Runtime | Node.js + Express | Ecosystem, async-first |
| Database | MongoDB + Mongoose | Flexible schema and efficient document updates |
| Auth | Google OAuth 2.0 | Users trust Google more than my password hashing |
| Tokens | JWT in HTTP-only cookie | XSS-safe, automatic with every request |
| Image Storage | Cloudinary | CDN delivery, no server disk usage |
| File Handling | Multer (disk storage) | Streams to disk before Cloudinary |
| Validation | Joi | Schema validation before DB writes |
| Frontend | React + Redux Toolkit | State management via RTK slices |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                         CLIENT                           │
│  React + Redux (Vercel) ── credentials:"include" │
└──────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER                        │
│                                                          │
│  CORS → cookieParser → express.json                      │
│                    │                                     │
│         ┌──────────┼──────────┐                          │
│         ▼          ▼          ▼                          │
│      /auth       /album     /image                       │
│      (open)    +verify    +verify                        │
│               +isOwner                                   │
│                    │                                     │
│         Controllers → Models → Utils                     │
└──────────────────────────────────────────────────────────┘
          │               │               │
          ▼               ▼               ▼
     MongoDB Atlas    Cloudinary     Google OAuth
```

### Critical Middleware Path — `DELETE /album/delete/:id`

```
Request
  → verifyMiddleware     (JWT from cookie → req.user)
  → isOwner middleware   (fetch album, compare ownerId with req.user._id)
  → deleteAlbum controller
        ├── ImageModel.deleteMany({ albumId }) + cloudinary.uploader.destroy()
        └── AlbumModel.findByIdAndDelete(id)
```

---

## Implementation Highlights

Some implementation choices that significantly improved reliability:

- **HTTP-only JWT cookies** instead of storing tokens in localStorage
- **Ownership middleware** that validates resource access before mutations
- **Promise.allSettled** for graceful degradation during multi-query operations
- **Compound MongoDB indexes** based on actual query patterns
- **Cascade deletion** that removes Cloudinary assets as well as database records
- **Pagination** on all collection endpoints
- **Defensive validation** using Joi before database writes

The focus was not just building features, but building features that fail predictably and recover gracefully.

---

## API Reference

### Authentication (`/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/auth/google` | ❌ | Redirect to Google consent screen |
| GET | `/auth/google/callback` | ❌ | OAuth callback → set JWT cookie → redirect to frontend |
| GET | `/auth/me` | ✅ | Returns current user |
| POST | `/auth/logout` | ✅ | Clears JWT cookie |

### Albums (`/album`) — All routes require authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/album/all?page=1&limit=10` | Paginated album list; auto-creates default album on first call |
| GET | `/album/:id` | Single album |
| POST | `/album/create` | Create album |
| PATCH | `/album/update/:id` | Update album (owner only) |
| DELETE | `/album/delete/:id` | Delete album + cascade delete all images (owner only; default album protected) |
| POST | `/album/:id/share` | Add `sharedUserIds` to album |

### Images (`/image`) — All routes require authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/image/upload` | Upload 1–15 images (`multipart/form-data`, field: `image`) |
| GET | `/image/:albumId/images?page=1&limit=20` | Paginated images for album |
| GET | `/image/:albumId/images/favorites` | Paginated favorites |
| GET | `/image/:albumId/images/filter?tags=beach` | Filter by tag |
| GET | `/image/:imageId` | Single image |
| PUT | `/image/:imageId/toggle` | Toggle `isFavorite` |
| PATCH | `/image/:imageId/comment` | Append a comment — body: `{ "comment": "string" }` |
| DELETE | `/image/delete/:imageId` | Delete from DB + Cloudinary |

---

## Database Design

### User
```js
{ email: String (unique), name: String, timestamps }
```

### Album
```js
{
  name: String,
  description: String,
  ownerId: ObjectId → User,   // indexed
  sharedUserIds: [ObjectId],
  isDefault: Boolean
}
// Indexes:
// { ownerId: 1, isDefault: 1 }   — find default album fast
// { ownerId: 1, createdAt: -1 }  — sort by recency
```

### Image
```js
{
  albumId: ObjectId → Album,  // indexed
  name, url, size, cloudinaryId (unique),
  tags: [String],             // indexed
  person: [String],
  isFavorite: Boolean,        // indexed
  comments: [String]
}
// Indexes:
// { albumId: 1, createdAt: -1 }  — album feed pagination
// { albumId: 1, isFavorite: 1 }  — favorites filter
```

---

## The Pain Points 
> "Works on my machine" is not a deployment strategy.

### 1. Google OAuth Callback URL Matching

**What worked locally:** `http://localhost:5000/auth/google/callback` ✅

**What happened in production:** `redirect_uri_mismatch` error. Hours of debugging.

**What I learned:** Google's URL matching is character-exact. No trailing slash. No HTTP vs HTTPS mismatch. No extra query params.

**Fix:** Separate OAuth credentials for dev and prod. Copy-paste the URL, never retype it.

### 2. CORS + HTTP-only Cookies

**The symptoms:** Worked perfectly on localhost. After deployment — `req.cookies` was always empty.

**The root cause:** Four things must align simultaneously:

```js
// 1. Backend CORS config
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,  // NOT OPTIONAL
}));

// 2. Cookie settings
res.cookie("jwt_token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
});

// 3. Frontend fetch
fetch(url, { credentials: "include" });
```

### 3. Multer + Memory Storage = Crashed Server

**The problem:** `memoryStorage` keeps every uploaded file in RAM. Multiple 5MB files = 50MB+ spike.

**The fix:** Disk storage → upload to Cloudinary → delete from disk.

### 4. Promise.all vs Promise.allSettled

**The problem:** If `countDocuments` fails, `Promise.all` crashes the entire request.

**The fix:** `Promise.allSettled` allows graceful degradation — pagination breaks but albums still load.

---

## Security

| Threat | Mitigation |
|--------|------------|
| XSS | HTTP-only cookie — JavaScript can't read `document.cookie` |
| CSRF | `sameSite` + exact `origin` CORS |
| Unauthorized access | JWT middleware on all protected routes |
| Resource tampering | `isOwner` middleware before every mutation |
| Injection | Mongoose schemas + Joi validation |
| File upload abuse | 5MB per file, 15 file limit |
| Default album deletion | Explicit guard in `deleteAlbum` controller |

---

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas free tier)
- [Cloudinary](https://cloudinary.com) account
- Google Cloud project with OAuth 2.0 credentials

### Installation

```bash
git clone https://github.com/Rakeshneopane/imageApp-backend.git
cd imageApp-backend
npm install
cp .env.example .env
# Fill in .env values
npm run dev
```

### Environment Variables

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/kavios

GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

JWT_SECRET_KEY=at_least_32_random_characters_here

CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret

FRONTEND_URL=http://localhost:5173
```

---

## What I'd Do Differently

1. **Redis for session management** — JWT revocation is hard without it
2. **Winston for logging** — `console.log` everywhere right now
3. **Integration tests** — Jest + supertest for auth and upload flows
4. **Sharp.js for image resizing** — Auto-resize on upload would save storage
5. **Refresh token rotation** — Currently using 1-hour JWT with no refresh

---

## Roadmap

**Done ✅**
- Google OAuth + JWT sessions
- Album CRUD with ownership + sharing
- Bulk image upload to Cloudinary
- Favorites, tags, comments, filtering
- Pagination on all list endpoints

**In Progress**
- Refresh token rotation

**Planned**
- Image search by person name
- Export album as ZIP
- Drag-drop reordering
- WebSocket notifications for shared albums

---

## Contact

For bugs, feedback, feature requests, or collaboration opportunities:

**Rakesh Neopane**

[![GitHub](https://img.shields.io/badge/GitHub-Rakeshneopane-181717?style=for-the-badge&logo=github)](https://github.com/Rakeshneopane)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Rakesh%20Neopane-0077B5?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/rakesh-neopane)

- 📧 Email: rakeshkumarneopane@gmail.com
- 📧 Alternate Email: lucasneopane123@gmail.com

*Star this repo if you've ever spent hours debugging a CORS error that turned out to be a missing `credentials: true`.* ⭐

---
