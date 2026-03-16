# PromptsFor_ImageGen

PromptFor_ImageGen is a React + Vite front-end starter tailored for building image-generation galleries with Appwrite. It ships with auth, upload, gallery browsing, and profile pages wired through React Router and an Appwrite SDK–ready context.

## Live Demo https://imagegenprompt.onrender.com/
## Features
- 🔐 **Authentication flow** (login, profile, password reset screens).
- 🖼️ **Image gallery** with home and full-gallery views.
- ⬆️ **Upload page(needs passkey)** scaffold to send new images/prompts.
- 🧭 **Layout shell** with routed pages using React Router v7.
- 🎨 **Tailwind CSS** styling plus Lucide icons and Framer Motion-ready animations.
- ☁️ **Appwrite SDK** included for backend services (auth, storage, DB).

## Tech Stack
- **Frontend:** React 19, Vite 6, React Router 7
- **UI/UX:** Tailwind CSS 4, Lucide icons, Framer Motion
- **Backend SDK:** Appwrite JavaScript SDK
- **Tooling:** ESLint 9, Prettier 3

## Project Structure
- `src/`
  - `App.jsx` — routes and providers
  - `main.jsx` — app bootstrap
  - `components/` — layout & shared UI
  - `pages/` — Home, FullGallery, Upload, Auth, Profile, ResetPassword
  - `context/` — AuthContext integrating Appwrite SDK
- `public/` — static assets
- `vite.config.js` — Vite configuration
- `eslint.config.js` — lint rules

## Getting Started
```bash
# 1) Install deps
npm install

# 2) Run dev server (http://localhost:5173 by default)
npm run dev

# 3) Production build
npm run build

# 4) Preview production build
npm run preview
```

### Environment Variables
Create a `.env` (or `.env.local`) with your Appwrite settings:
```
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT=<your-project-id>
VITE_APPWRITE_DATABASE_ID=<db-id>
VITE_APPWRITE_COLLECTION_ID=<collection-id>
VITE_APPWRITE_BUCKET_ID=<bucket-id>
```
Adjust keys to match the Appwrite resources you use (auth, storage, database).

## Available Scripts
- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview built assets
- `npm run lint` — run ESLint

## Deployment
- Build with `npm run build`; deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, etc.).
- Ensure environment variables are provided at build time (VITE_* vars must be exposed).

## License
This project is licensed under the terms of the license in [`LICENSE`](LICENSE).

## Contributing
Issues and PRs are welcome! Open an issue to discuss improvements or new features.
