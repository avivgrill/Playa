# Playa Management — CGMP Compliance

Internal web application for CGMP compliance tracking at a single manufacturing facility.

**Stack:** React + Vite · Firebase Auth · Firebase Hosting · Docker (dev)

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| Docker Desktop | latest | https://docker.com/products/docker-desktop |
| Firebase CLI | latest | `npm install -g firebase-tools` |
| Git | any | https://git-scm.com |

---

## 1. Firebase project setup (one-time)

1. Go to https://console.firebase.google.com and create a new project.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. In **Authentication → Users**, add the first user manually (email + password).
4. In **Project settings → General → Your apps**, click **Add app → Web**.
   Copy the `firebaseConfig` values — you'll need them in the next step.
5. In **Hosting**, click **Get started** and follow the prompts (the CLI handles the rest).

---

## 2. Local environment file

```bash
cp .env.example .env
```

Open `.env` and fill in the values from your Firebase project settings:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Also update `.firebaserc` with your actual project ID:

```json
{ "projects": { "default": "your-firebase-project-id" } }
```

---

## 3. Local development

### Option A — Docker (recommended)

```bash
docker compose up
```

App is available at http://localhost:5173. Hot-reload is active via the volume mount.

### Option B — Node.js directly

```bash
npm install
npm run dev
```

---

## 4. Deploy to Firebase Hosting

```bash
npm run build          # builds to /dist
firebase login         # first time only
firebase deploy        # uploads /dist to Firebase Hosting
```

Firebase will print the live URL when the deploy finishes.

---

## 5. Project structure

```
Playa_Management/
├── src/
│   ├── firebase/config.js      # Firebase init (reads from .env)
│   ├── contexts/AuthContext.jsx # Auth state + logout
│   ├── components/PrivateRoute.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   └── Dashboard.jsx
│   ├── App.jsx                 # Router + auth wiring
│   └── main.jsx
├── Dockerfile
├── docker-compose.yml
├── firebase.json               # Hosting config (SPA rewrites)
├── .firebaserc                 # Firebase project alias
├── .env.example                # Template — copy to .env
└── vite.config.js
```

---

## 6. Adding users

Users are managed directly in the Firebase console under **Authentication → Users**. There is no self-registration flow — access is invitation-only by design.

---

## Notes

- `.env` is git-ignored. Never commit real credentials.
- The app is a single-page application; all routes redirect to `index.html` (configured in `firebase.json`).
- Unauthenticated users are always redirected to `/login`.
