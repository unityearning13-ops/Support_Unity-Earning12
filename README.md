# Unity Earning Live Chat

A modern, fast, lightweight, and mobile-friendly real-time live messaging web application built with React, Vite, Tailwind CSS, Express, and Firebase. Specifically engineered to remain lightning-fast and usable on slow 3G mobile connections, low-bandwidth networks, and older Android devices.

## Features

- **Branding**: Unity Earning Live Chat with fresh, high-contrast light design (blue, green, white, and slate accents).
- **Zero-Friction Authentication**: Simple Name & WhatsApp/Mobile number sign-in backed by secure Firebase Authentication with unique User IDs.
- **Fast Real-Time Messaging**: 1-to-1 private chat with instant real-time synchronization via Firebase Firestore (`onSnapshot`).
- **Slow 3G & Mobile Optimization**:
  - Tiny initial bundle size, zero heavy UI frameworks.
  - Native client-side HTML5 canvas image compressor (~20-40 KB vs 5 MB).
  - Lightweight audio voice notes compressed using native MediaRecorder & Web Audio API.
  - Pagination of messages (recent 25 messages first, upward scroll/older pagination).
  - Automatic offline detection, reconnection retry handling, and slow connection alerts.
- **Media Support**:
  - Instant text messages with delivery status (`sent` -> `delivered` -> `read`).
  - Voice notes with live duration recording, preview before sending, and in-chat audio player.
  - Compressed photo sharing.
  - Quick emoji selection bar.
- **Presence System**:
  - Live Online / Offline green indicators and "Last seen at..." timestamps.
- **User Discovery & Contacts**:
  - Fast search by Name or Mobile/WhatsApp number without downloading the entire user database.
  - "+ Add Contact" modal by mobile number with immediate lookup.
- **Profile Management**:
  - Update display name, upload/change profile photo, and inspect registered phone number.
- **Secure Admin Panel**:
  - Password protected (initial password `212650`).
  - Password checked strictly on the server backend — never leaked to frontend JavaScript!
  - Full analytics dashboard: Total users, Active users, Blocked users, Online users, Total conversations, Total messages, Registrations today.
  - User management table with search and instant Block/Unblock enforcement backed by Firestore Security Rules.
- **WebRTC Voice/Video Calling Architecture**:
  - Built-in interactive calling modal ready for WebRTC audio/video calls.
- **PWA Ready**:
  - Add to Home Screen support with web app manifest and install button.

## Architecture

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide icons.
- **Backend / API**: Express server (`server.ts`) hosting API routes (admin verification, health check) and serving Vite.
- **Database & Realtime**: Firebase Firestore (Enterprise/Standard).
- **Rules**: Hardened `firestore.rules` deployed and enforced.

## Deployment to Vercel

1. Push this repository to GitHub or GitLab.
2. In [Vercel](https://vercel.com):
   - Click **Add New Project** and import your repository.
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Environment Variables to add in Vercel Project Settings:
   - `ADMIN_PASSWORD`: Your secret admin password (default: `212650`)
   - `VITE_FIREBASE_API_KEY`: from your Firebase console
   - `VITE_FIREBASE_PROJECT_ID`: from your Firebase console
   - `VITE_FIREBASE_APP_ID`: from your Firebase console
   - `VITE_FIREBASE_STORAGE_BUCKET`: from your Firebase console
4. Click **Deploy**. Your app will be live at `https://unity-earning-live-chat.vercel.app`!
