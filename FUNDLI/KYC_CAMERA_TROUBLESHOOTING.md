# KYC Camera Troubleshooting & Setup Guide

This guide helps you run, debug, and fix camera issues in the KYC flow (`KYCPage` → `KYCFacialVerification`).

## Quick Checklist
- Use HTTPS or localhost.
- Allow camera permissions in the browser for this site.
- Close other apps using the camera (Teams/Zoom/Meet).
- Use modern browsers (Chrome/Edge). Test another browser if needed.
- Start the dev server; do not open `index.html` directly.

## How to Run Locally
```bash
cd FUNDLI
npm install
npm run dev
# if testing on device or strict browsers, use HTTPS:
# npx vite --https
```
Open the printed URL (e.g., `http://localhost:5173`). For HTTPS testing, use the HTTPS URL.

## Where the Camera Is Used
- `src/pages/kyc/KYCPage.jsx` orchestrates KYC.
- `src/components/kyc/KYCFacialVerification.jsx` handles camera capture and verification.
- `src/components/kyc/CameraTest.jsx` is a minimal diagnostic preview.

## Recent Reliability Improvements
- Secure-context detection (HTTPS/localhost) with actionable error.
- Permission diagnostics using the Permissions API when available.
- Readiness via `loadedmetadata`/`canplay`/`playing` events instead of assuming immediate readiness.
- Autoplay policy handling; prompts user if blocked.
- Safe fallback to ultra-simple `{ video: true }` constraints.
- Device enumeration to surface “no camera detected” clearly.

## Step-by-Step Debugging
1. Open KYC → click "Test Camera".
   - It will list available cameras and try a simple preview.
   - If no devices: check Device Manager (Windows) / Privacy settings.
2. Start Verification → Step 2 (Capture Live Photo) → click "Start Camera".
   - If preview stays blank:
     - Click the button again (autoplay could be blocked).
     - Try "Simple Camera" or "FORCE START CAMERA".
3. If you see an error banner:
   - NotAllowedError → Allow camera in site permissions and reload.
   - NotFoundError → No camera connected or drivers missing.
   - NotReadableError → Close other apps using the camera.
   - OverconstrainedError → Device cannot satisfy constraints; use Simple Camera.
   - Insecure context → Switch to HTTPS or localhost.
4. Open DevTools Console for logs: look for lines starting with 🎥/✅/⚠️/❌.

## Common Environment Fixes (Windows)
- Settings → Privacy & security → Camera → Allow apps and browsers to access.
- Edge/Chrome Site settings → Reset permissions → Set Camera to "Allow".
- Kill other apps using camera (Task Manager).

## Face-API Models
Models are loaded from multiple sources: CDN → local `/public/models` → alt CDN. If models fail, photo capture still works; advanced liveness is skipped with a notice. Ensure the files exist in `public/models/` (already included).

## Production
- Must be served over HTTPS for camera to work.
- If using a custom domain, enable HTTPS (e.g., Vercel/Netlify default).

## When Filing a Bug
Include:
- Browser + version, OS, and whether HTTPS/localhost.
- Exact error message shown.
- Console logs around "Starting camera initialization".
- Whether CameraTest preview works.
