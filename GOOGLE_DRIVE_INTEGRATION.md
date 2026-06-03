Google Drive Integration Guide for VaultX

Overview

This document explains how to configure Google Cloud Console and wire up the VaultX Angular app to store files directly in each user's Google Drive account.

1) Create OAuth Client ID

- Go to Google Cloud Console -> APIs & Services -> Credentials
- Create a new OAuth 2.0 Client ID (Web application)
  - Name: VaultX Web Client
  - Authorized JavaScript origins: e.g. http://localhost:4200
  - Authorized redirect URIs: (not required for token client flow)
- Copy the Client ID value.

2) Enable Google Drive API

- In the Cloud Console, go to Library and enable "Google Drive API" for the project.

3) Scopes

The app uses the following minimal scopes:

- https://www.googleapis.com/auth/drive.file  (create and manage files created by the app in the user's Drive)
- openid, profile, email — for user identity (optional)

Notes on scope selection:
- `drive.file` allows the app to create a folder and manage files created by the app. If you need full Drive access (list all user files, etc.), you would request `https://www.googleapis.com/auth/drive` but that is broader.

4) Environment variables

Update the environment files with the OAuth client ID:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Example:

```ts
export const environment = {
  production: false,
  firebase: { /* existing */ },
  google: {
    clientId: 'YOUR_GOOGLE_OAUTH_CLIENT_ID',
  },
};
```

5) How the app works (summary)

- `GoogleAuthService` loads Google Identity Services (GSI) at runtime and requests an access token using the Token Client flow.
- `GoogleDriveService` calls Drive REST endpoints using the access token to create the `VaultX` folder, upload files (multipart), list files, download blobs, rename and delete files.
- Files uploaded to Drive are stored in the user's own Drive account. Metadata saved in Firestore includes a `downloadUrl` prefixed with `gdrive:{fileId}` and `storagePath` set to `gdrive:{fileId}`.
- UI components detect `gdrive:` URLs and fetch blobs for previews and downloads using the Drive API and the current user's access token.

6) Required npm packages

- No extra npm packages are strictly required for Drive access — the app dynamically injects Google's client script at runtime. However, ensure your project dependencies are installed:

```bash
npm install
```

7) Local testing

- Start the Angular dev server:

```bash
npm start
```

- Open the app, click "Connect Google Drive" in the header, consent to Drive scopes, then upload files — they will be saved into a `VaultX` folder in your Drive.

8) Security notes

- Access tokens are kept in-memory (and short-lived). For production-level persistent access and refresh tokens, consider a server-side OAuth flow (authorization code + refresh token) and a secure backend to proxy Drive requests.
- `drive.file` scope restricts access to files your app creates; it is safer than full `drive` scope.

9) Troubleshooting

- If uploads fail, check browser console for Drive API errors (insufficient scopes, quota, or CORS).
- Ensure the Google OAuth client has the correct JavaScript origin configured.


If you want, I can:
- Add UI improvements (status indicator, storage usage fetched from Drive),
- Migrate Firestore metadata schema to include provider and fileId fields explicitly,
- Or switch the app to use Drive-only storage by default.

