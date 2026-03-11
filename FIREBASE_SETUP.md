# Firebase Setup Guide

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Name it (e.g., `tessa-portfolio`)
4. Disable Google Analytics (not needed) or enable if you want
5. Click **Create project**

## 2. Enable Authentication

1. In your Firebase project, go to **Build > Authentication**
2. Click **Get started**
3. Under **Sign-in method**, enable **Email/Password**
4. Go to the **Users** tab
5. Click **Add user** and enter Tessa's email + a password
   - This will be the only admin account

## 3. Create Firestore Database

1. Go to **Build > Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select the nearest region (e.g., `europe-west1` for Netherlands)
5. After creation, go to the **Rules** tab and set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read published projects
    match /projects/{projectId} {
      allow read: if resource.data.published == true;
      allow read, write: if request.auth != null;
    }
  }
}
```

6. Click **Publish**

## 4. Enable Storage

1. Go to **Build > Storage**
2. Click **Get started**
3. Accept the default rules, then update them to:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /portfolio/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```

4. Click **Publish**

## 5. Get Your Web Config

1. Go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"**
3. Click the **Web** icon (`</>`)
4. Register the app (name: `portfolio`)
5. Copy the `firebaseConfig` object

## 6. Update the Config File

Open `js/firebase-config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## 7. Done!

- Visit `yoursite.com/admin` to log in and manage content
- Add projects with thumbnails, descriptions, Vimeo links, and gallery images
- Published projects will appear on the public site automatically

## How It Works

- **Before Firebase is configured**: The site shows the fallback/static content (existing images)
- **After Firebase is configured**: The site loads content dynamically from Firestore
- **Admin panel** (`/admin`): Log in with the email/password from step 2 to add/edit/delete projects
- **Images**: Uploaded to Firebase Storage, URLs stored in Firestore
